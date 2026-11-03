import type { Server as HttpServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Redis } from 'ioredis';
import { Server, type ServerOptions } from 'socket.io';

import { isRedisReady, redis } from './redis';
import { registerSocketHandlers } from '../sockets';

let io: Server | null = null;
let redisPubClient: Redis | null = null;
let redisSubClient: Redis | null = null;

const isProd = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

/**
 * Initialize Socket.IO with HTTP server and optional Redis Adapter
 */
export const initSocket = (httpServer: HttpServer): Server => {
  const socketOptions: Partial<ServerOptions> = {
    cors: {
      origin: isProd && allowedOrigins.length > 0 ? allowedOrigins : true,
      credentials: true,
    },
    pingTimeout: 20000,
    pingInterval: 25000,
  };

  io = new Server(httpServer, socketOptions);

  // Redis adapter for multi-instance scaling
  if (isRedisReady()) {
    try {
      redisPubClient = redis.duplicate();
      redisSubClient = redis.duplicate();
      io.adapter(createAdapter(redisPubClient, redisSubClient));
      console.log('Socket.IO Redis adapter attached for horizontal scaling.');
    } catch (err) {
      console.warn('Failed to attach Redis adapter for Socket.IO. Running in-memory.', err);
    }
  }

  // Register subscribe / unsubscribe listeners
  registerSocketHandlers(io);

  return io;
};

/**
 * Global getter for the initialized Socket.IO instance
 */
export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized. Call initSocket(httpServer) first.');
  }
  return io;
};

/**
 * Emit an event ONLY to clients who are subscribed to this room (e.g. "devices:mgr_101")
 */
export const emitToRoom = <T = unknown>(room: string, event: string, payload: T): void => {
  getIO().to(room.trim()).emit(event, payload);
};

/**
 * Broadcast an event to ALL connected clients across the entire application
 */
export const broadcast = <T = unknown>(event: string, payload: T): void => {
  getIO().emit(event, payload);
};

/**
 * Graceful termination of all socket connections
 */
export const closeSocket = async (): Promise<void> => {
  if (!io) return;

  console.log('Closing Socket.IO connections...');
  io.disconnectSockets(true);

  await new Promise<void>((resolve) => {
    io?.close(() => {
      console.log('Socket.IO server closed.');
      resolve();
    });
  });

  if (redisPubClient && redisPubClient.status !== 'end') {
    await redisPubClient.quit();
  }
  if (redisSubClient && redisSubClient.status !== 'end') {
    await redisSubClient.quit();
  }
};
