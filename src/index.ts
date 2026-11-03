import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import app from './config/app';
import { connectDB, disconnectDB } from './config/database';

const PORT = Number(process.env.PORT) || 3000;
const httpServer = createServer(app);

// Process-wide exception handling
process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('Unhandled Promise Rejection:', reason);
});

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    const server = httpServer.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });

    // Graceful shutdown handler
    const handleShutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

      // Force process exit if graceful shutdown hangs
      const forceExitTimer = setTimeout(() => {
        console.error('Graceful shutdown timed out after 10s. Forcing exit.');
        process.exit(1);
      }, 10000);
      forceExitTimer.unref();

      // Immediately terminate idle keep-alive connections
      if (typeof server.closeIdleConnections === 'function') {
        server.closeIdleConnections();
      }

      server.close(async () => {
        try {
          await disconnectDB();
          console.log('Server and database disconnected cleanly.');
          process.exit(0);
        } catch (err) {
          console.error('Error during shutdown:', err);
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
