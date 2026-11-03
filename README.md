# Node.js TypeScript Starter Boilerplate

A production-ready, highly-optimized Node.js + Express starter template written in TypeScript with MongoDB (Mongoose), Redis (ioredis), and WebSockets (Socket.IO with Redis Adapter), designed for rapid backend development.

---

## Features

- **Express 5 & TypeScript**: Built with the latest Express 5 and strict TypeScript configuration.
- **Fast Development & Bundling**: Powered by `tsx` (instant hot-reload) and `tsup` (blazing-fast ES module build).
- **Socket.IO Real-Time WebSockets**:
  - Horizontal multi-node scaling via `@socket.io/redis-adapter` (with seamless in-memory fallback).
  - Clean room subscription model (`subscribe`, `unsubscribe`).
  - Server-side helpers: `emitToRoom(room, event, data)` and `broadcast(event, data)`.
  - Context & Hierarchy isolated: Only clients subscribed to a specific room receive its live data.
  - Graceful socket connection draining on server shutdown.
- **Redis & Distributed Rate Limiting**:
  - `ioredis` with exponential backoff, reconnect handling, and lazy-connect options.
  - Distributed `express-rate-limit` using `rate-limit-redis` (works across multi-instance clusters).
  - Graceful fallback (`passOnStoreError: true`) so the server remains available even if Redis is temporarily offline.
  - High-performance `cache` utility with Cache-Aside pattern (`getOrSet`), JSON serialization, TTL support, and non-blocking key pattern scanning (`scanStream`).
- **Graceful Shutdown**: Safe termination handling (`SIGINT`, `SIGTERM`) that drains active HTTP connections and closes WebSockets first before disconnecting MongoDB and Redis in parallel, backed by a 10s safety timeout.
- **Production-Ready Security**:
  - `helmet` for HTTP security headers
  - Configurable `cors` origins for both Express and WebSockets
  - Request body limits (`1mb`) to prevent payload-based DoS
  - Distributed rate limiting for DDoS / brute-force protection
- **Global Error Handling**: Centralized error middleware with automatic error sanitization in production.
- **Standardized API Responses**: Pre-built typed response utility (`sendSuccess`, `sendCreated`, `sendBadRequest`, `sendServerError`, `sendTooManyRequests`, etc.).
- **Health Check**: Built-in `/health` endpoint tracking uptime, timestamps, active socket connections, and real-time MongoDB & Redis connection status.
- **Process Resilience**: Process-level listeners for `uncaughtException` and `unhandledRejection`.

---

## Project Structure

```text
├── src/
│   ├── config/
│   │   ├── app.ts        # Express application configuration & middlewares
│   │   ├── database.ts   # MongoDB connection & lifecycle events
│   │   ├── redis.ts      # Redis client, retry strategy & connection lifecycle
│   │   └── socket.ts     # Socket.IO setup, Redis adapter, emitToRoom & broadcast
│   ├── sockets/
│   │   └── index.ts      # Socket event listeners (subscribe & unsubscribe)
│   ├── utils/
│   │   ├── cache.ts      # Production Redis caching helper (get, set, del, getOrSet)
│   │   └── response.ts   # Standardized API response helpers & types
│   └── index.ts          # Server entry point & graceful shutdown
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore rules
├── package.json          # Project metadata & dependencies
└── tsconfig.json         # Strict TypeScript compiler options
```

---

## Getting Started

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/rohitPsiborg06/NodeJsSetup.git
cd NodeJsSetup
npm install
```

### 2. Configure Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Update your configuration in `.env`:

```env
PORT=3000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/mydb
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret_here
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 3. Run the Application

- **Development Mode** (with hot reload):
  ```bash
  npm run dev
  ```

- **Type Check**:
  ```bash
  npm run typecheck
  ```

- **Build for Production**:
  ```bash
  npm run build
  ```

- **Start Production Build**:
  ```bash
  npm start
  ```

---

## Real-Time Module & Hierarchy Usage Example

### Client-Side (Frontend / Dashboard):

When a manager opens the **Device** module:
```javascript
import { io } from "socket.io-client";
const socket = io("http://localhost:3000");

// 1. Entering Device Page: Subscribe to manager's device room
socket.emit("subscribe", "devices:mgr_101");

// Listen for updates made by any sub-user under this manager
socket.on("device_changed", (data) => {
  console.log("Device update received:", data);
});

// 2. Leaving Device Page / Switching to Alert Page:
socket.emit("unsubscribe", "devices:mgr_101");
socket.emit("subscribe", "alerts:mgr_101");

socket.on("alert_triggered", (alert) => {
  console.log("Alert received:", alert);
});
```

### Server-Side (Controllers / Services):

Whenever a device or alert changes:
```typescript
import { emitToRoom, broadcast } from './config/socket';

// Emits ONLY to users currently subscribed to this manager's device room
emitToRoom('devices:mgr_101', 'device_changed', {
  deviceId: 'DEV-884',
  status: 'ONLINE',
  modifiedBy: 'sub_user_03',
});

// Emits ONLY to users in the alerts room
emitToRoom('alerts:mgr_101', 'alert_triggered', {
  level: 'CRITICAL',
  message: 'Device battery low',
});

// Broadcast to everyone connected
broadcast('system_notification', { message: 'Scheduled maintenance in 1 hour' });
```

---

## Redis Cache Helper Usage Example

```typescript
import { cache } from './utils/cache';

// Cache-aside pattern: check cache first, fetch from DB on miss, cache for 5 mins (300s)
const user = await cache.getOrSet(`user:${userId}`, async () => {
  return await UserModel.findById(userId);
}, 300);

// Direct set / get
await cache.set('my-key', { foo: 'bar' }, 60);
const data = await cache.get<{ foo: string }>('my-key');

// Invalidate pattern safely with SCAN (non-blocking)
await cache.delByPattern('user:*');
```

---

## API Endpoints

| Method | Endpoint  | Description                                                         |
|--------|-----------|---------------------------------------------------------------------|
| `GET`  | `/`       | Welcome / root ping                                                 |
| `GET`  | `/health` | Health check (uptime, active socket count, MongoDB & Redis statuses)|

---

## License

ISC
