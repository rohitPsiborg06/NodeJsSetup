import type { Server, Socket } from 'socket.io';

/**
 * Register lightweight room-based subscription handlers
 */
export const registerSocketHandlers = (io: Server): void => {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    /**
     * Subscribe to a room/module (e.g. "devices:mgr_101", "alerts:mgr_101")
     * Only users in this room will receive room-specific events.
     */
    socket.on('subscribe', (room: string) => {
      if (typeof room === 'string' && room.trim()) {
        const cleanRoom = room.trim();
        socket.join(cleanRoom);
        console.log(`[Socket] ${socket.id} joined room: "${cleanRoom}"`);
      }
    });

    /**
     * Unsubscribe from a room when user leaves that screen/tab
     */
    socket.on('unsubscribe', (room: string) => {
      if (typeof room === 'string' && room.trim()) {
        const cleanRoom = room.trim();
        socket.leave(cleanRoom);
        console.log(`[Socket] ${socket.id} left room: "${cleanRoom}"`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${socket.id} (${reason})`);
    });

    socket.on('error', (err) => {
      console.error(`[Socket] Error on ${socket.id}:`, err);
    });
  });
};
