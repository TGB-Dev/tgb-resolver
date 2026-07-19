# tgb-resolver

The Gifted Battlefield resolver for ICPC/DMOJ-style contest feeds.

Server-authoritative event timeline with realtime signaling,
driving audience and control UIs from a single source of truth.

## Stack

| Layer       | Tech                                                                           |
|-------------|--------------------------------------------------------------------------------|
| Workspace   | Turborepo, pnpm workspaces                                                     |
| Frontend    | React 19, TanStack Start (SPA), Vite 8, Chakra UI 3, Preact Signals            |
| Server      | .NET 10, FastEndpoints, SignalR (MessagePack), EF Core Sqlite, NSwag, Mapperly |
| Contracts   | `@hey-api/openapi-ts`, `ofetch`, TanStack Query, Valibot                       |
| Parsers     | .NET `TGB.Resolver.IcpcXmlParser` (server-side)                                |
| Lint/Format | Biome, syncpack                                                                |
| Tests       | Vitest, Testing Library (web), TUnit (.NET)                                    |

## Prerequisites

- Node.js >= 24.15.0
- pnpm >= 11.1.3
- .NET SDK 10.0.301

## Getting Started

```sh
pnpm install
pnpm hooks:install
cp .env.example .env    # VITE_API_URL defaults to http://localhost:5001
```

## Development

```sh
pnpm dev
```

Runs the server (port 5001) and frontend (port 3000) in parallel.

| Route      | UI       |
|------------|----------|
| `/`        | Audience |
| `/control` | Control  |

Server solution: `apps/server/TGB.Resolver.Server.slnx` (.slnx format).
Frontend app: `apps/web/` (TanStack Start SPA).

## Build & Test

```sh
pnpm build          # Turborepo dependency-order build
pnpm check-types    # tsc --noEmit for all TS packages
pnpm test           # vitest (TS) + dotnet test (.NET)
pnpm serve          # production previews
```

The `packages/contracts` package generates its TypeScript HTTP client from
`apps/server/TGB.Resolver.Server/openapi.yaml` (via `openapi-ts`) before building, and
`packages/realtime` generates its SignalR hub client from the server via the `dotnet-tsrts` tool.
The OpenAPI document is emitted automatically by the server `build` (
`dotnet build -p:GenerateOpenApiDocument=true`), so a normal `pnpm build` keeps both clients
current.

## Native Git Hooks

```sh
pnpm hooks:install     # one-time, enables .githooks/pre-commit
```

Pre-commit runs: `biome check --write --staged` → `sync:check || sync` → `build` → `test`.

## Structure

```text
apps/
  server/     .NET 10 solution (server + parser + tests)
  web/        TanStack Start SPA frontend
packages/
  contracts/   OpenAPI-generated TS HTTP client, TanStack Query helpers, Valibot schemas
  realtime/    Client-side clock sync, timeline and domain helpers
```
