import { isRedisReady, redis } from '../config/redis';

/**
 * High-performance, production-ready Redis Cache Utility
 */
export const cache = {
  /**
   * Retrieve parsed JSON data from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!isRedisReady()) return null;

    try {
      const data = await redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`Cache GET error for key "${key}":`, error);
      return null;
    }
  },

  /**
   * Store data in cache with optional TTL in seconds
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!isRedisReady()) return;

    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await redis.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await redis.set(key, serialized);
      }
    } catch (error) {
      console.error(`Cache SET error for key "${key}":`, error);
    }
  },

  /**
   * Delete a single key from cache
   */
  async del(key: string): Promise<void> {
    if (!isRedisReady()) return;

    try {
      await redis.del(key);
    } catch (error) {
      console.error(`Cache DEL error for key "${key}":`, error);
    }
  },

  /**
   * Safely delete keys matching a pattern using non-blocking SCAN (Never use KEYS in production)
   */
  async delByPattern(pattern: string): Promise<number> {
    if (!isRedisReady()) return 0;

    return new Promise((resolve) => {
      let deletedCount = 0;
      const stream = redis.scanStream({
        match: pattern,
        count: 100,
      });

      stream.on('data', async (keys: string[]) => {
        if (keys.length > 0) {
          stream.pause();
          try {
            await redis.del(...keys);
            deletedCount += keys.length;
          } catch (err) {
            console.error(`Error deleting keys for pattern "${pattern}":`, err);
          } finally {
            stream.resume();
          }
        }
      });

      stream.on('end', () => resolve(deletedCount));
      stream.on('error', (err) => {
        console.error(`SCAN stream error for pattern "${pattern}":`, err);
        resolve(deletedCount);
      });
    });
  },

  /**
   * Cache-Aside Helper: Returns cached data if available; otherwise executes fetcher, caches, and returns.
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds = 300): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const freshData = await fetcher();
    await this.set(key, freshData, ttlSeconds);
    return freshData;
  },
};
