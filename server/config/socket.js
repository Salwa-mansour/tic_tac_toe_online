// socket.js
import { Server } from 'socket.io';

// Map to store active online players: Key = identifier, Value = socketId
export const onlinePlayers = new Map();

export function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: '*', // Allows connections from any frontend origin during development
      methods: ['GET', 'POST']
    }
  });

  // 1. Connection Middleware: Verify identifier during handshake
  io.use((socket, next) => {
    const identifier = socket.handshake.auth?.identifier;

    if (!identifier) {
      return next(new Error('Authentication failed: Identifier (email/phone) missing.'));
    }

    // Attach identifier to the socket instance for easy reference
    socket.identifier = identifier.trim().toLowerCase();
    next();
  });

  // 2. Connection Event
  io.on('connection', (socket) => {
    const playerIdentifier = socket.identifier;

    // Register player in the online Map
    onlinePlayers.set(playerIdentifier, socket.id);
    console.log(`🟢 Player connected: ${playerIdentifier} (Socket ID: ${socket.id})`);

    // Broadcast updated online players count/list to everyone connected
    io.emit('presence:online_players', Array.from(onlinePlayers.keys()));

    // 3. Disconnect Event
    socket.on('disconnect', () => {
      onlinePlayers.delete(playerIdentifier);
      console.log(`🔴 Player disconnected: ${playerIdentifier}`);

      // Broadcast updated list after disconnection
      io.emit('presence:online_players', Array.from(onlinePlayers.keys()));
    });
  });

  return io;
}