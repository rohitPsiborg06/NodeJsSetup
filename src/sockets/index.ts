import type { Server, Socket } from 'socket.io';

export type AckCallback = (response: {
  success: boolean;
  message?: string;
  channels?: string[];
}) => void;

/**
 * Format channel name to avoid room name collisions
 */
export const formatChannel = (channel: string): string => `channel:${channel.trim()}`;

/**
 * Register all application socket event handlers
 */
export const registerSocketHandlers = (io: Server): void => {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Track active client subscriptions in memory per connection
    const subscriptions = new Set<string>();

    /**
     * Subscribe to a single channel or an array of channels
     */
    socket.on('subscribe', (channelInput: string | string[], callback?: AckCallback) => {
      try {
        const channels = Array.isArray(channelInput) ? channelInput : [channelInput];
        const validChannels = channels.map((c) => String(c).trim()).filter(Boolean);

        if (validChannels.length === 0) {
          callback?.({ success: false, message: 'Channel name cannot be empty.' });
          return;
        }

        validChannels.forEach((channel) => {
          const room = formatChannel(channel);
          socket.join(room);
          subscriptions.add(channel);
          console.log(`[Socket] ${socket.id} subscribed to "${channel}"`);
        });

        socket.emit('subscribed', { channels: validChannels });
        callback?.({ success: true, channels: validChannels });
      } catch (err) {
        console.error(`[Socket] Subscribe error for ${socket.id}:`, err);
        callback?.({ success: false, message: 'Failed to subscribe.' });
      }
    });

    /**
     * Unsubscribe from a single channel or an array of channels
     */
    socket.on('unsubscribe', (channelInput: string | string[], callback?: AckCallback) => {
      try {
        const channels = Array.isArray(channelInput) ? channelInput : [channelInput];
        const validChannels = channels.map((c) => String(c).trim()).filter(Boolean);

        if (validChannels.length === 0) {
          callback?.({ success: false, message: 'Channel name cannot be empty.' });
          return;
        }

        validChannels.forEach((channel) => {
          const room = formatChannel(channel);
          socket.leave(room);
          subscriptions.delete(channel);
          console.log(`[Socket] ${socket.id} unsubscribed from "${channel}"`);
        });

        socket.emit('unsubscribed', { channels: validChannels });
        callback?.({ success: true, channels: validChannels });
      } catch (err) {
        console.error(`[Socket] Unsubscribe error for ${socket.id}:`, err);
        callback?.({ success: false, message: 'Failed to unsubscribe.' });
      }
    });

    /**
     * Unsubscribe from all active channels
     */
    socket.on('unsubscribe_all', (callback?: AckCallback) => {
      try {
        subscriptions.forEach((channel) => {
          socket.leave(formatChannel(channel));
        });

        const removedChannels = Array.from(subscriptions);
        subscriptions.clear();

        socket.emit('unsubscribed_all', { channels: removedChannels });
        callback?.({ success: true, channels: removedChannels });
      } catch (err) {
        console.error(`[Socket] Unsubscribe all error for ${socket.id}:`, err);
        callback?.({ success: false, message: 'Failed to unsubscribe from all channels.' });
      }
    });

    /**
     * Retrieve the list of active subscriptions for the current socket
     */
    socket.on('get_subscriptions', (callback?: (channels: string[]) => void) => {
      const activeList = Array.from(subscriptions);
      socket.emit('subscriptions', activeList);
      callback?.(activeList);
    });

    // Latency / Ping check
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      subscriptions.clear();
      console.log(`[Socket] Client disconnected: ${socket.id} (${reason})`);
    });

    // Handle socket error
    socket.on('error', (err) => {
      console.error(`[Socket] Error for client ${socket.id}:`, err);
    });
  });
};
