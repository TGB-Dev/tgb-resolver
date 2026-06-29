# tgb-resolver

The Gifted Battlefield resolver for ICPC/DMOJ-style event feeds.

This workspace is centered on a .NET 10 server solution that owns HTTP contracts and realtime signaling, with Nx orchestrating the frontend and TypeScript packages around it.

## Stack

| Layer | Tech |
| --- | --- |
| Workspace | Nx, pnpm workspaces |
| Frontend | React 19, TanStack Start, Vite 8, Chakra UI 3, Jotai, react-window |
| Server | .NET 10, FastEndpoints, SignalR, EF Core Sqlite, NSwag, Mapperly |
| Contracts | `@hey-api/openapi-ts`, `ofetch`, TanStack Query, Valibot |
| Server-side parser | `TGB.Resolver.IcpcXmlParser` |
| Lint/Format | Biome, syncpack |
| Tests | Vitest, Testing Library, xUnit |

## Prerequisites

- Node.js >= 24.15.0
- pnpm >= 11.1.3
- .NET SDK 10.0.301

## Getting Started

```sh
pnpm install
pnpm hooks:install
cp .env.example .env
```

The frontend reads `VITE_API_URL` and defaults to `http://localhost:5001`.

## Development

```sh
pnpm dev
```

- Audience UI: `/`
- Control UI: `/control`

The .NET server solution lives under [apps/server](/Volumes/SSDBox/Codes/tgb-resolver/apps/server) and the TanStack Start app lives under [apps/web](/Volumes/SSDBox/Codes/tgb-resolver/apps/web).

## Build and Test

```sh
pnpm build
pnpm check-types
pnpm test
```

The contracts package generates its TypeScript client from [apps/server/TGB.Resolver.Server/openapi.yaml](/Volumes/SSDBox/Codes/tgb-resolver/apps/server/TGB.Resolver.Server/openapi.yaml) before building.

## Native Git Hooks

This repo uses native Git hooks from [.githooks](/Volumes/SSDBox/Codes/tgb-resolver/.githooks) instead of Husky.

Install them once per clone:

```sh
pnpm hooks:install
```

The pre-commit hook runs:

- `biome check --write --staged`
- dependency sync checks
- contracts generation/build
- web tests

## Structure

```text
apps/
  server/   .NET 10 server solution and tests
  web/      TanStack Start frontend
packages/
  contracts/         generated HTTP client, query helpers, and valibot schemas
  realtime/          shared client-side realtime/domain helpers
  icpc-xml-parser/   legacy TypeScript ICPC XML parser
```
