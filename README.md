# TGB Resolver

A real-time resolver system built with Go (backend) and Vue 3 (frontend).

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development (server + web)
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Architecture

- **Server**: Go 1.26+ (Gin, Huma v2, WebSocket, Bun ORM, Wire DI)
- **Frontend**: Vue 3 SPA (Pinia, TanStack Query, Panda CSS, Ark UI)
- **Contracts**: OpenAPI + Protobuf code generation

## Documentation

See [AGENTS.md](./AGENTS.md) for detailed architecture, conventions, and development guidelines.

## Ports

- **Server**: 5001 (default)
- **Web**: 3000 (dev)

## Environment

Server configuration via environment variables:
- `PORT` - Server port (default: 5001)
- `ALLOWED_ORIGINS` - CORS allowed origins (default: `*`)
- `DATA_DIR` - Data directory path (default: `.data`)

Frontend configuration via `.env`:
- `VITE_API_URL` - API base URL (default: `http://localhost:5001`)
