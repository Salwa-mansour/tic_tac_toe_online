import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

// Change this to match your backend URL (e.g., http://localhost:3000 or production URL)
const SOCKET_URL = import.meta.env.VITE_API_URL;

export function useSocket(identifier) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  
  // Game & Invite States
  const [incomingChallenge, setIncomingChallenge] = useState(null); // { from, challengerSocketId }
  const [gameState, setGameState] = useState(null); // Active room data
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    // 1. Guard: Only connect if an identifier exists
    if (!identifier) return;

    // 2. Initialize Socket Connection with authentication payload
    const socket = io(SOCKET_URL, {
      auth: { identifier },
      autoConnect: true,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // --------------------------------------------------
    // CONNECTION LISTENERS
    // --------------------------------------------------
    socket.on('connect', () => {
      console.log('🟢 Connected to Socket server with ID:', socket.id);
      setIsConnected(true);
      setStatusMessage('');
    });

    socket.on('disconnect', () => {
      console.log('🔴 Disconnected from Socket server');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Connection error:', err.message);
      setStatusMessage(`Connection failed: ${err.message}`);
    });

    // --------------------------------------------------
    // PRESENCE & CHALLENGE LISTENERS
    // --------------------------------------------------
    // Receive list of all active online player identifiers
    socket.on('presence:online_players', (players) => {
      // Filter out our own identifier from the list
      setOnlinePlayers(players.filter((p) => p !== identifier.toLowerCase()));
    });

    // Receive incoming challenge from another player
    socket.on('incoming_challenge', ({ from, challengerSocketId }) => {
      setIncomingChallenge({ from, challengerSocketId });
    });

    // Handle when challenger cancels or timeout expires
    socket.on('challenge_cancelled', () => {
      setIncomingChallenge(null);
      setStatusMessage('The challenge was cancelled or expired.');
    });

    socket.on('challenge_timeout', ({ message }) => {
      setStatusMessage(message);
    });

    socket.on('challenge_declined', ({ by, message }) => {
      setStatusMessage(message);
    });

    socket.on('challenge_error', ({ message }) => {
      setStatusMessage(message);
    });

    // --------------------------------------------------
    // GAMEPLAY LISTENERS
    // --------------------------------------------------
    // Called when match starts (either by accepting or having an invite accepted)
    socket.on('match_started', ({ roomId, symbol, opponent, isMyTurn }) => {
      setIncomingChallenge(null); // Clear any open popups
      setStatusMessage('');

      setGameState({
        roomId,
        mySymbol: symbol, // 'X' or 'O'
        opponent,
        board: Array(9).fill(null),
        isMyTurn,
        isGameOver: false,
        winnerSymbol: null,
        winningLine: [],
        isDraw: false
      });
    });

    // Board updated after a valid move
    socket.on('board_updated', ({ board, nextTurnSocketId }) => {
      setGameState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          board,
          isMyTurn: nextTurnSocketId === socket.id
        };
      });
    });

    // Game completed (win / loss / draw)
    socket.on('game_over', ({ board, isDraw, winnerSymbol, winningLine, winnerSocketId }) => {
      setGameState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          board,
          isMyTurn: false,
          isGameOver: true,
          isDraw,
          winnerSymbol,
          winningLine,
          didIWin: winnerSocketId === socket.id
        };
      });
    });

    // Opponent disconnected mid-match
    socket.on('opponent_disconnected', ({ message }) => {
      setStatusMessage(message);
      setGameState((prev) => {
        if (!prev) return null;
        return { ...prev, isGameOver: true, didIWin: true };
      });
    });

    socket.on('move_error', ({ message }) => {
      setStatusMessage(message);
    });

    // --------------------------------------------------
    // CLEANUP ON UNMOUNT
    // --------------------------------------------------
    return () => {
      socket.disconnect();
    };
  }, [identifier]);

  // --------------------------------------------------
  // HELPER EMITTERS (ACTIONS)
  // --------------------------------------------------
  const sendChallenge = (targetIdentifier) => {
    setStatusMessage(`Challenging ${targetIdentifier}...`);
    socketRef.current?.emit('challenge_player', { targetIdentifier });
  };

  const respondToChallenge = (challengerIdentifier, accepted) => {
    socketRef.current?.emit('respond_to_challenge', { challengerIdentifier, accepted });
    setIncomingChallenge(null); // Close modal locally
  };

  const makeMove = (index) => {
    if (!gameState || !gameState.isMyTurn || gameState.isGameOver) return;
    socketRef.current?.emit('make_move', { roomId: gameState.roomId, index });
  };

  const resetGameLocalState = () => {
    setGameState(null);
    setStatusMessage('');
  };

  return {
    socket: socketRef.current,
    isConnected,
    onlinePlayers,
    incomingChallenge,
    gameState,
    statusMessage,
    sendChallenge,
    respondToChallenge,
    makeMove,
    resetGameLocalState
  };
}