import { Server } from 'socket.io';
import Environment from '../models/Environment.js';
import { getAllFlagsCache } from '../services/redisService.js';

let io = null;
const envSubscriptions = new Map();

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('subscribe', async ({ envKey, userContext }) => {
      const environment = await Environment.findOne({ secretKey: envKey });
      if (!environment) {
        socket.emit('error', { message: 'Invalid environment key' });
        return;
      }

      socket.join(envKey);
      envSubscriptions.set(socket.id, envKey);

      let cachedFlags = await getAllFlagsCache(envKey);
      let flags = cachedFlags
        ? Object.values(cachedFlags)
        : [];

      socket.emit('flag-sync', { flags });
      console.log(`Socket ${socket.id} subscribed to ${envKey}`);
    });

    socket.on('unsubscribe', ({ envKey }) => {
      socket.leave(envKey);
      envSubscriptions.delete(socket.id);
    });

    socket.on('disconnect', () => {
      envSubscriptions.delete(socket.id);
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const emitFlagUpdate = (envKey, flagKey, flagData, isDeleted = false) => {
  if (io) {
    io.to(envKey).emit('flag-update', {
      key: flagKey,
      flag: flagData,
      isDeleted
    });
  }
};

export const getIO = () => io;