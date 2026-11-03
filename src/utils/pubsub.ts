import type { Redis } from 'ioredis';
import { isRedisReady, redis } from '../config/redis';
import { emitToChannel } from '../config/socket';

type MessageHandler = (data: unknown, channel: string) => void;

class PubSubManager {
  private subClient: Redis | null = null;
  private channelHandlers = new Map<string, Set<MessageHandler>>();

  /**
   * Lazy-initializes the subscriber client
   */
  private getSubClient(): Redis | null {
    if (!isRedisReady()) return null;

    if (!this.subClient) {
      this.subClient = redis.duplicate();

      this.subClient.on('message', (channel: string, rawMessage: string) => {
        let parsedData: unknown = rawMessage;
        try {
          parsedData = JSON.parse(rawMessage);
        } catch {
          // Keep raw string if not JSON
        }

        const handlers = this.channelHandlers.get(channel);
        if (handlers) {
          handlers.forEach((handler) => {
            try {
              handler(parsedData, channel);
            } catch (err) {
              console.error(`Error in PubSub handler for channel "${channel}":`, err);
            }
          });
        }
      });

      this.subClient.on('error', (err) => {
        console.error('PubSub subscriber client error:', err);
      });
    }

    return this.subClient;
  }

  /**
   * Publish a message to a Redis channel
   */
  async publish(channel: string, message: unknown): Promise<void> {
    if (!isRedisReady()) {
      console.warn(`Redis is not ready. Cannot publish to channel "${channel}".`);
      return;
    }

    try {
      const payload = typeof message === 'string' ? message : JSON.stringify(message);
      await redis.publish(channel, payload);
    } catch (error) {
      console.error(`PubSub publish error on channel "${channel}":`, error);
    }
  }

  /**
   * Subscribe a local handler to a Redis channel
   */
  async subscribe(channel: string, handler: MessageHandler): Promise<void> {
    const client = this.getSubClient();
    if (!client) {
      console.warn(`Redis is not ready. Cannot subscribe to channel "${channel}".`);
      return;
    }

    if (!this.channelHandlers.has(channel)) {
      this.channelHandlers.set(channel, new Set());
      await client.subscribe(channel);
      console.log(`[PubSub] Subscribed to Redis channel: "${channel}"`);
    }

    this.channelHandlers.get(channel)?.add(handler);
  }

  /**
   * Unsubscribe a handler (or all handlers) from a Redis channel
   */
  async unsubscribe(channel: string, handler?: MessageHandler): Promise<void> {
    if (!this.subClient || !this.channelHandlers.has(channel)) return;

    const handlers = this.channelHandlers.get(channel);

    if (handler && handlers) {
      handlers.delete(handler);
      if (handlers.size > 0) return;
    }

    this.channelHandlers.delete(channel);
    try {
      await this.subClient.unsubscribe(channel);
      console.log(`[PubSub] Unsubscribed from Redis channel: "${channel}"`);
    } catch (err) {
      console.error(`PubSub unsubscribe error for channel "${channel}":`, err);
    }
  }

  /**
   * Forward Redis pub/sub messages on a channel directly to WebSocket room subscribers
   */
  async bridgeToSocket(channel: string, socketEvent = 'channel_message'): Promise<void> {
    await this.subscribe(channel, (data) => {
      emitToChannel(channel, socketEvent, data);
    });
  }

  /**
   * Graceful disconnection of the subscriber client
   */
  async disconnect(): Promise<void> {
    if (this.subClient && this.subClient.status !== 'end') {
      await this.subClient.quit();
      this.subClient = null;
      this.channelHandlers.clear();
      console.log('PubSub subscriber disconnected cleanly.');
    }
  }
}

export const pubsub = new PubSubManager();
