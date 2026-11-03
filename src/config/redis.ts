import { Redis } from 'ioredis';

const isProd = process.env.NODE_ENV === 'production';
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
  retryStrategy(times: number) {
    if (times > 10) {
      console.warn('Redis retry attempts exhausted (10). Reconnection stopped.');
      return null;
    }
    return Math.min(times * 150, 3000);
  },
});

redis.on('ready', () => {
  console.log('Redis connected and ready.');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message || err);
});

redis.on('reconnecting', (delay: number) => {
  console.warn(`Redis reconnecting in ${delay}ms...`);
});

redis.on('close', () => {
  console.log('Redis connection closed.');
});

export const connectRedis = async (): Promise<void> => {
  try {
    if (redis.status === 'wait') {
      await redis.connect();
    }
  } catch (error) {
    if (isProd) {
      throw new Error(`Critical Redis connection failure in production: ${error}`);
    }
    console.warn('Redis not available. Continuing in fallback mode for development.');
  }
};

export const disconnectRedis = async (): Promise<void> => {
  if (redis.status !== 'end' && redis.status !== 'wait') {
    await redis.quit();
    console.log('Redis disconnected cleanly.');
  }
};

export const isRedisReady = (): boolean => redis.status === 'ready';
