# tgb-resolver

The Gifted Battlefield resolver for ICPC/DMOJ/VNOJ-style contest feeds.

> [!NOTE]
> This project is heavily inspired, with a large portion of parsing code being ported over/referenced from the [ICPC resolver](https://github.com/icpctools/icpctools/tree/main/Resolver), and [VNOI Resolver](https://github.com/VNOI-Admin/vnoi-resolver).
>
> We sincerely thanks the authors for their time on crafting algorithms for these beautiful leaderboard resolving systems!

> [!WARNING]
> We currently support only the VNOJ contest format. See https://github.com/VNOI-Admin/OJ/blob/master/judge/contest_format/vnoj.py for more details.

Server-authoritative event timeline with realtime signaling,
driving audience and control UIs from a single source of truth.

## Stack

| Layer       | Tech                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------- |
| Workspace   | Turborepo, pnpm workspaces                                                               |
| Frontend    | Vue 3.5, Pinia, vue-router, Vite 8, Panda CSS + Chakra preset, Ark UI, motion-v           |
| Server      | Go 1.26+, Gin, Huma v2, coder/websocket, Bun ORM, modernc.org/sqlite, Wire DI           |
| Contracts   | `@hey-api/openapi-ts`, `ofetch`, TanStack Query, Valibot, Protobuf (buf)                 |
| Parsers     | Go `features/importing` (server-side)                                                    |
| Lint/Format | Biome, syncpack, go fmt                                                                  |
| Tests       | Vitest, Testing Library (web), Go testing (server)                                       |

## Prerequisites

- Node.js >= 24.15.0
- pnpm >= 11.1.3
- Go 1.26+

## Getting Started

```sh
pnpm install
cp .env.example .env    # VITE_API_URL defaults to http://localhost:5001
```

## Development

```sh
pnpm dev
```

Runs the server (port 5001) and the Vue frontend (port 3000) in parallel.

| Route      | UI       |
| ---------- | -------- |
| `/`        | Audience |
| `/control` | Control  |

Server: `apps/server/` — Go HTTP/WebSocket server.
Frontend: `apps/web/` — the Vue 3 SPA (package `@tgb-resolver/web`, dev port 3000).

## Build & Test

```sh
pnpm build          # Turborepo dependency-order build
pnpm check-types    # tsc --noEmit for all TS packages, go vet for Go
pnpm test           # vitest (TS) + go test (Go)
pnpm serve          # production previews
pnpm format         # go fmt (Go) + biome format (TS/Vue)
```

The `packages/contracts` package generates its TypeScript HTTP client from
`apps/server/openapi.yaml` (via `openapi-ts`) before building, and
`packages/realtime` generates its Protobuf types from `apps/server/proto/` via `buf`.
The OpenAPI document is emitted automatically by the server `build` (
`go run . --dump-openapi openapi.yaml`), so a normal `pnpm build` keeps both clients
current.

## Environment

Server configuration via environment variables:
- `PORT` - Server port (default: 5001)
- `ALLOWED_ORIGINS` - CORS allowed origins (default: `*`)
- `DATA_DIR` - Data directory path (default: `.data`)

Frontend configuration via `.env`:
- `VITE_API_URL` - API base URL (default: `http://localhost:5001`)

## Git Hooks

Hooks are managed by Husky (auto-installed via `pnpm install` `prepare` script).

Pre-commit runs: `sync:check || sync` → `go fmt` (server) → `test` → `biome check --write --staged --no-errors-on-unmatched` → `git add -u`.

## Structure

```text
apps/
  server/     Go 1.26+ HTTP/WebSocket server (Gin, Huma v2, Bun ORM, Wire)
  web/        Canonical Vue 3 SPA frontend (Pinia, Panda CSS, Ark UI, vue-router)
              package @tgb-resolver/web, dev port 3000
              src/features/   — vertical feature slices
                control/        — playback, timeline, transport, cue tab stores
                leaderboard/    — leaderboard grid/table stores
                assets-manager/ — folder/file asset browser store
                shared/         — cross-feature stores (show, realtime, confirm, fullscreen)
                extensions/     — extension registry, config UI, server patch API
packages/
  contracts/   OpenAPI-generated TS HTTP client, TanStack Query helpers, Valibot schemas
  realtime/    Protobuf-generated types, client-side clock sync, timeline and domain helpers
```

## Documentation

See [AGENTS.md](./AGENTS.md) for detailed architecture, conventions, and development guidelines.

## License:

MIT License

Copyright (c) 2026 The Gifted Battlefield Organization.

## Backstory

The original idea came from @hmthien050209, and with the help of @dzhoz0 and other colleagues (AI-assistance, some non-tech colleagues who aided us on the UX side), here comes our resolver!

We decided to craft this software because we want a solution that's:

- Easy to customize heavily (like the media/image extensions that we're doing)
- Performant
- Fast to iterate pre-resolve while maintaining customizability, without writing/running a bunch of scripts
- Be centralized
- And expose UIs that both operators/MCs/other people at different department (live streaming, on stage, etc.) can sync together on timings.

We're heavily inspired by the UIs of lighting/VJ software, as they have similar constraints to us. Ours are way simpler, but we can still adapt from them.

Then this project is born to solve all of the requirements of us. We decided to go with DOM-based because modern browsers can handle big things well, and it's only us footgunning ourselves via state managements.
And with the power of WAAPI (via motion.dev), we're now able to render smooth animations across many components (both in the control panel, and the audience view) at 60+ FPS (at most 75 FPS tested, and
it ran stablely).
