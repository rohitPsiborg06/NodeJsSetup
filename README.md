# Node.js TypeScript Starter Boilerplate

A production-ready, highly-optimized Node.js + Express starter template written in TypeScript with MongoDB (Mongoose), designed for rapid backend development.

---

## Features

- **Express 5 & TypeScript**: Built with the latest Express 5 and strict TypeScript configuration.
- **Fast Development & Bundling**: Powered by `tsx` (instant hot-reload) and `tsup` (blazing-fast ES module build).
- **Graceful Shutdown**: Safe termination handling (`SIGINT`, `SIGTERM`) that drains active HTTP connections first before disconnecting MongoDB, backed by a 10s safety timeout.
- **Production-Ready Security**:
  - `helmet` for HTTP security headers
  - Configurable `cors` origins
  - Request body limits (`1mb`) to prevent payload-based DoS
  - `express-rate-limit` for DDoS / brute-force protection
- **Global Error Handling**: Centralized error middleware with automatic error sanitization in production.
- **Standardized API Responses**: Pre-built typed response utility (`sendSuccess`, `sendCreated`, `sendBadRequest`, `sendServerError`, `sendTooManyRequests`, etc.).
- **Health Check**: Built-in `/health` endpoint tracking uptime, timestamps, and real-time MongoDB connection status.
- **Process Resilience**: Process-level listeners for `uncaughtException` and `unhandledRejection`.

---

## Project Structure

```text
├── src/
│   ├── config/
│   │   ├── app.ts        # Express application configuration & middlewares
│   │   └── database.ts   # MongoDB connection & lifecycle events
│   ├── utils/
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

## API Endpoints

| Method | Endpoint  | Description                              |
|--------|-----------|------------------------------------------|
| `GET`  | `/`       | Welcome / root ping                      |
| `GET`  | `/health` | Health check (uptime, memory, DB status) |

---

## License

ISC
