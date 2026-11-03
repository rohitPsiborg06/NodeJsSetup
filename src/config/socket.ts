import type { Server as HttpServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Redis } from 'ioredis';
import { Server, type ServerOptions } from 'socket.io';

import { isRedisReady, redis } from './redis';
import { formatChannel, registerSocketHandlers } from '../sockets';

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

  // Attach Redis adapter for multi-instance scaling if Redis is operational
  if (isRedisReady()) {
    try {
      redisPubClient = redis.duplicate();
      redisSubClient = redis.duplicate();
      io.adapter(createAdapter(redisPubClient, redisSubClient));
      console.log('Socket.IO Redis adapter attached for horizontal scaling.');
    } catch (err) {
      console.warn('Failed to initialize Redis adapter for Socket.IO. Defaulting to in-memory adapter.', err);
    }
  }

  // Socket Authentication Middleware placeholder (ready for JWT verification)
  io.use((socket, next) => {
    // const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
    // Perform authentication if required; call next(new Error('Unauthorized')) to reject
    next();
  });

  // Register socket event handlers
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
 * Emit an event to all clients subscribed to a specific channel
 */
export const emitToChannel = <T = unknown>(channel: string, event: string, payload: T): void => {
  const socketServer = getIO();
  socketServer.to(formatChannel(channel)).emit(event, payload);
};

/**
 * Broadcast an event to all connected clients
 */
export const broadcastToAll = <T = unknown>(event: string, payload: T): void => {
  const socketServer = getIO();
  socketServer.emit(event, payload);
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
