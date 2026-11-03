# Node.js TypeScript Starter Boilerplate

A production-ready, highly-optimized Node.js + Express starter template written in TypeScript with MongoDB (Mongoose), Redis (ioredis), and WebSockets (Socket.IO with Redis Adapter & Pub/Sub), designed for rapid backend development.

---

## Features

- **Express 5 & TypeScript**: Built with the latest Express 5 and strict TypeScript configuration.
- **Fast Development & Bundling**: Powered by `tsx` (instant hot-reload) and `tsup` (blazing-fast ES module build).
- **Socket.IO Real-Time WebSockets**:
  - Horizontal multi-node scaling via `@socket.io/redis-adapter`.
  - Global `getIO()` singleton to emit events from any controller, service, or route.
  - Channel subscription management: `subscribe`, `unsubscribe`, `unsubscribe_all`, and `get_subscriptions`.
  - Server-side helpers: `emitToChannel(channel, event, payload)` and `broadcastToAll(event, payload)`.
  - Graceful socket connection draining on server shutdown.
- **Redis & Distributed Rate Limiting**:
  - `ioredis` with exponential backoff, reconnect handling, and lazy-connect options.
  - Distributed `express-rate-limit` using `rate-limit-redis` (works across multi-instance clusters).
  - Graceful fallback (`passOnStoreError: true`) so the server remains available even if Redis is temporarily offline.
  - High-performance `cache` utility with Cache-Aside pattern (`getOrSet`), JSON serialization, TTL support, and non-blocking key pattern scanning (`scanStream`).
  - Redis Pub/Sub manager (`pubsub.publish`, `pubsub.subscribe`, `pubsub.unsubscribe`, `pubsub.bridgeToSocket`).
- **Graceful Shutdown**: Safe termination handling (`SIGINT`, `SIGTERM`) that drains active HTTP connections and closes WebSockets first before disconnecting MongoDB, Redis, and PubSub in parallel, backed by a 10s safety timeout.
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
│   │   └── socket.ts     # Socket.IO setup, Redis adapter & emission helpers
│   ├── sockets/
│   │   └── index.ts      # Client socket event listeners (subscribe/unsubscribe/rooms)
│   ├── utils/
│   │   ├── cache.ts      # Production Redis caching helper (get, set, del, getOrSet)
│   │   ├── pubsub.ts     # Redis Pub/Sub manager with WebSocket bridge
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

## Real-Time Channel Subscription Example

### Client-side (Frontend / Mobile):

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

// 1. Subscribe to a channel (with optional ack callback)
socket.emit("subscribe", "orders:123", (res) => {
  console.log("Subscribed:", res); // { success: true, channels: ['orders:123'] }
});

// 2. Listen to incoming events on that channel
socket.on("order_updated", (data) => {
  console.log("Order update received:", data);
});

// 3. Unsubscribe from a channel
socket.emit("unsubscribe", "orders:123");

// 4. Check active subscriptions
socket.emit("get_subscriptions", (channels) => {
  console.log("My channels:", channels);
});

// 5. Unsubscribe from all channels
socket.emit("unsubscribe_all");
```

### Server-side (Backend emitting to subscribers):

```typescript
import { emitToChannel, broadcastToAll } from './config/socket';

// Emit only to clients subscribed to "orders:123"
emitToChannel('orders:123', 'order_updated', { status: 'SHIPPED', eta: 'Tomorrow' });

// Broadcast to every connected client
broadcastToAll('announcement', { text: 'Platform maintenance scheduled.' });
```

---

## Redis Pub/Sub Example

For cross-service or inter-process communication:

```typescript
import { pubsub } from './utils/pubsub';

// Publish to a Redis channel
await pubsub.publish('payment_events', { orderId: '123', amount: 99.99 });

// Subscribe to a Redis channel
await pubsub.subscribe('payment_events', (data, channel) => {
  console.log(`Received message on ${channel}:`, data);
});

// Automatically forward Redis channel messages to WebSocket subscribers
await pubsub.bridgeToSocket('crypto_prices', 'price_tick');
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
