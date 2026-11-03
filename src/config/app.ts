import cors from 'cors';
import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import mongoose from 'mongoose';
import morgan from 'morgan';
import { RedisStore } from 'rate-limit-redis';

import { redis } from './redis';
import { getIO } from './socket';
import { sendError, sendNotFound, sendServerError, sendSuccess, sendTooManyRequests } from '../utils/response';

const isProd = process.env.NODE_ENV === 'production';
const app: Application = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(morgan(isProd ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Distributed Rate Limiter backed by Redis (falls back gracefully if store errors)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // 100 requests per window per IP
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  passOnStoreError: true, // If Redis is unavailable, allow request instead of failing 500
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(args[0]!, ...args.slice(1)) as Promise<any>,
    prefix: 'rl:global:',
  }),
  handler: (_req: Request, res: Response) => {
    return sendTooManyRequests(res, 'Too many requests, please try again later.');
  },
});

app.use(globalLimiter);

// CORS configuration
const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: isProd && allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  })
);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  return sendSuccess(res, null, 'Hello Developer.');
});

// Health check endpoint (MongoDB + Redis + Sockets status)
app.get('/health', (_req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const redisStatus = redis.status === 'ready' ? 'connected' : 'disconnected';

  let activeSockets = 0;
  try {
    activeSockets = getIO().engine.clientsCount;
  } catch {
    activeSockets = 0;
  }

  const isHealthy = dbStatus === 'connected' && (redisStatus === 'connected' || !isProd);

  return sendSuccess(
    res,
    {
      status: isHealthy ? 'healthy' : 'degraded',
      uptime: process.uptime(),
      timestamp: Date.now(),
      services: {
        database: dbStatus,
        redis: redisStatus,
        activeSockets,
      },
    },
    'Health check complete.'
  );
});

// 404 Catch-all handler
app.use((_req: Request, res: Response) => {
  return sendNotFound(res, 'Route not found.');
});

// Global error handler
interface HttpError extends Error {
  status?: number;
  statusCode?: number;
  type?: string;
}

app.use((err: HttpError, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status ?? err.statusCode ?? 500;

  console.error(`[${req.method}] ${req.originalUrl} ->`, err);

  if (err.type === 'entity.parse.failed') {
    return sendError(res, 'Invalid JSON body.', 400);
  }

  if (err.type === 'entity.too.large') {
    return sendError(res, 'Payload too large.', 413);
  }

  if (status >= 400 && status < 500) {
    return sendError(res, err.message, status);
  }

  return sendServerError(
    res,
    isProd ? 'Internal Server Error' : err.message || 'Internal Server Error',
    isProd ? null : err.stack ?? err
  );
});

export default app;
