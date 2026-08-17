import { Server } from 'socket.io';
import { Player } from '../models/Player.js';
import { Game } from '../models/Game.js';

export const onlinePlayers = new Map();
export const playerStates = new Map();
export const activeRooms = new Map();

// Server-Side Tic-Tac-Toe Win Checker
function checkBoardWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  for (let [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winnerSymbol: board[a], winningLine: [a, b, c] };
    }
  }

  // Check if board is full (Draw)
  if (board.every((square) => square !== null)) {
    return { isDraw: true };
  }

  return null;
}

// Database helper to update players and create match log
async function finalizeGameInDB(room, result) {
  try {
    const { player1, player2 } = room;

    // Fetch Mongoose Player documents by identifier
    const [p1Doc, p2Doc] = await Promise.all([
      Player.findOne({ identifier: player1.identifier }),
      Player.findOne({ identifier: player2.identifier })
    ]);

    if (!p1Doc || !p2Doc) return;

    let winnerId = null;
    let isDraw = false;

    if (result.isDraw) {
      isDraw = true;
      p1Doc.draws += 1;
      p2Doc.draws += 1;
    } else {
      const winningPlayerObj = (result.winnerSymbol === 'X') ? player1 : player2;
      const losingPlayerObj = (result.winnerSymbol === 'X') ? player2 : player1;

      const winningDoc = (winningPlayerObj.identifier === p1Doc.identifier) ? p1Doc : p2Doc;
      const losingDoc = (losingPlayerObj.identifier === p1Doc.identifier) ? p1Doc : p2Doc;

      winnerId = winningDoc._id;
      winningDoc.wins += 1;
      losingDoc.losses += 1;
    }

    // Save player updates concurrently
    await Promise.all([p1Doc.save(), p2Doc.save()]);

    // Create match history record
    await Game.create({
      gameType: 'TicTacToe',
      player1: p1Doc._id,
      player2: p2Doc._id,
      winner: winnerId,
      isDraw: isDraw,
      status: 'COMPLETED'
    });

    console.log(`💾 Match saved to MongoDB for Room ${room.roomId}`);
  } catch (error) {
    console.error('Error saving match result to DB:', error);
  }
}

export function setupSocket(server) {
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  io.use((socket, next) => {
    const identifier = socket.handshake.auth?.identifier;
    if (!identifier) {
      return next(new Error('Authentication failed: Identifier missing.'));
    }
    socket.identifier = identifier.trim().toLowerCase();
    next();
  });

  io.on('connection', (socket) => {
    const playerIdentifier = socket.identifier;

    onlinePlayers.set(playerIdentifier, socket.id);
    playerStates.set(playerIdentifier, "AVAILABLE");

    io.emit('presence:online_players', Array.from(onlinePlayers.keys()));

    // ----------------------------------------------------
    // EVENT 1: CHALLENGE ANOTHER PLAYER
    // ----------------------------------------------------
    socket.on('challenge_player', ({ targetIdentifier }) => {
      const cleanTarget = targetIdentifier.trim().toLowerCase();

      if (cleanTarget === playerIdentifier) {
        return socket.emit('challenge_error', { message: 'You cannot challenge yourself.' });
      }

      const targetSocketId = onlinePlayers.get(cleanTarget);

      if (!targetSocketId) {
        return socket.emit('challenge_error', { message: `Player "${cleanTarget}" is offline.` });
      }

      if (playerStates.get(cleanTarget) === "IN_GAME") {
        return socket.emit('challenge_error', { message: `Player "${cleanTarget}" is currently in a game.` });
      }

      io.to(targetSocketId).emit('incoming_challenge', {
        from: playerIdentifier,
        challengerSocketId: socket.id
      });

      const timerId = setTimeout(() => {
        socket.emit('challenge_timeout', { message: `${cleanTarget} did not respond in time.` });
        io.to(targetSocketId).emit('challenge_cancelled', { from: playerIdentifier });
      }, 6*10000);

      socket.pendingChallengeTimer = timerId;
    });

    // ----------------------------------------------------
    // EVENT 2: RESPOND TO CHALLENGE
    // ----------------------------------------------------
    socket.on('respond_to_challenge', ({ challengerIdentifier, accepted }) => {
      const cIdentifier = challengerIdentifier.trim().toLowerCase();
      const challengerSocketId = onlinePlayers.get(cIdentifier);

      const challengerSocket = challengerSocketId ? io.sockets.sockets.get(challengerSocketId) : null;
      if (challengerSocket?.pendingChallengeTimer) {
        clearTimeout(challengerSocket.pendingChallengeTimer);
        challengerSocket.pendingChallengeTimer = null;
      }

      if (!challengerSocketId || !challengerSocket) {
        return socket.emit('challenge_error', { message: 'Challenger went offline.' });
      }

      if (playerStates.get(socket.identifier) === "IN_GAME" || playerStates.get(cIdentifier) === "IN_GAME") {
        return socket.emit('challenge_error', { message: 'One of the players is in another game.' });
      }

      if (!accepted) {
        return io.to(challengerSocketId).emit('challenge_declined', {
          by: socket.identifier,
          message: `${socket.identifier} declined your game invite.`
        });
      }

      playerStates.set(socket.identifier, "IN_GAME");
      playerStates.set(cIdentifier, "IN_GAME");

      const roomId = `room_${socket.id}_${challengerSocketId}`;

      challengerSocket.join(roomId);
      socket.join(roomId);

      activeRooms.set(roomId, {
        roomId,
        player1: { identifier: cIdentifier, socketId: challengerSocketId, symbol: 'X' },
        player2: { identifier: socket.identifier, socketId: socket.id, symbol: 'O' },
        board: Array(9).fill(null),
        currentTurnSocketId: challengerSocketId // X goes first
      });

      io.to(challengerSocketId).emit('match_started', {
        roomId,
        symbol: 'X',
        opponent: socket.identifier,
        isMyTurn: true
      });

      io.to(socket.id).emit('match_started', {
        roomId,
        symbol: 'O',
        opponent: cIdentifier,
        isMyTurn: false
      });
    });

    // ----------------------------------------------------
    // EVENT 3: MAKE MOVE & GAME LOOP
    // ----------------------------------------------------
    socket.on('make_move', async ({ roomId, index }) => {
      const room = activeRooms.get(roomId);

      if (!room) {
        return socket.emit('move_error', { message: 'Active game room not found.' });
      }

      // 1. Verify turn
      if (room.currentTurnSocketId !== socket.id) {
        return socket.emit('move_error', { message: 'Not your turn!' });
      }

      // 2. Verify square is empty & within bounds
      if (index < 0 || index > 8 || room.board[index] !== null) {
        return socket.emit('move_error', { message: 'Invalid move selection.' });
      }

      // 3. Apply move to room state
      const playerSymbol = (socket.id === room.player1.socketId) ? 'X' : 'O';
      room.board[index] = playerSymbol;

      // 4. Check for Win/Draw
      const gameResult = checkBoardWinner(room.board);

      if (gameResult) {
        // Broadcast Game Over event to room
        io.to(roomId).emit('game_over', {
          board: room.board,
          isDraw: !!gameResult.isDraw,
          winnerSymbol: gameResult.winnerSymbol || null,
          winningLine: gameResult.winningLine || [],
          winnerSocketId: gameResult.isDraw ? null : socket.id
        });

        // Save match statistics in MongoDB asynchronously
        await finalizeGameInDB(room, gameResult);

        // Reset player states back to AVAILABLE
        playerStates.set(room.player1.identifier, "AVAILABLE");
        playerStates.set(room.player2.identifier, "AVAILABLE");

        // Cleanup room memory
        activeRooms.delete(roomId);
      } else {
        // Switch turn to opponent
        room.currentTurnSocketId = (socket.id === room.player1.socketId)
          ? room.player2.socketId
          : room.player1.socketId;

        // Broadcast updated state to room
        io.to(roomId).emit('board_updated', {
          board: room.board,
          nextTurnSocketId: room.currentTurnSocketId,
          lastMoveIndex: index
        });
      }
    });

    // ----------------------------------------------------
    // DISCONNECT HANDLER (HANDLES IN-GAME FORFEITS)
    // ----------------------------------------------------
    socket.on('disconnect', async () => {
      onlinePlayers.delete(playerIdentifier);
      playerStates.delete(playerIdentifier);

      // Check if player was in an active game and award default win to opponent
      for (const [roomId, room] of activeRooms.entries()) {
        if (room.player1.socketId === socket.id || room.player2.socketId === socket.id) {
          const remainingPlayerObj = (room.player1.socketId === socket.id) ? room.player2 : room.player1;

          io.to(remainingPlayerObj.socketId).emit('opponent_disconnected', {
            message: 'Your opponent disconnected. You win by default!'
          });

          // Finalize forfeit in DB
          const result = { winnerSymbol: remainingPlayerObj.symbol };
          await finalizeGameInDB(room, result);

          playerStates.set(remainingPlayerObj.identifier, "AVAILABLE");
          activeRooms.delete(roomId);
          break;
        }
      }

      io.emit('presence:online_players', Array.from(onlinePlayers.keys()));
    });
  });

  return io;
}