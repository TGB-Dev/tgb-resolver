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
| Server      | .NET 10, FastEndpoints, SignalR (MessagePack), EF Core Sqlite, NSwag, Mapperly           |
| Contracts   | `@hey-api/openapi-ts`, `ofetch`, TanStack Query, Valibot                                 |
| Parsers     | .NET `TGB.Resolver.IcpcXmlParser` (server-side)                                          |
| Lint/Format | Biome, syncpack                                                                          |
| Tests       | Vitest, Testing Library (web), TUnit (.NET)                                              |

## Prerequisites

- Node.js >= 24.15.0
- pnpm >= 11.1.3
- .NET 10 SDK

## Getting Started

```sh
pnpm install
cp .env.example .env    # VITE_API_URL defaults to http://localhost:5001
```

## Development

```sh
pnpm dev
```

Runs the server (port 5001), canonical Vue frontend (port 5173), and legacy React frontend (port 3000) in parallel.

| Route      | UI       |
| ---------- | -------- |
| `/`        | Audience |
| `/control` | Control  |

Server solution: `apps/server/TGB.Resolver.Server.slnx` (.slnx format).
Canonical frontend: `apps/web-vue/`. Legacy React port source: `apps/web/`.

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

## Git Hooks

Hooks are managed by Husky (auto-installed via `pnpm install` `prepare` script).

Pre-commit runs: `sync:check || sync` → `test` → `biome check --write --staged --no-errors-on-unmatched` → `git add -u`.

## Structure

```text
apps/
  server/     .NET 10 solution (server + parser + tests)
  web/        TanStack Router SPA frontend
              src/features/   — 5 feature dirs each owning their own models
                control/        — playback, timeline, transport, cue tab models
                leaderboard/    — leaderboard grid/table models
                assets-manager/ — folder/file asset browser model
                shared/         — cross-feature models (show, realtime, confirm, fullscreen)
                extensions/     — extension registry, config UI, server patch API
packages/
  contracts/   OpenAPI-generated TS HTTP client, TanStack Query helpers, Valibot schemas
  realtime/    Client-side clock sync, timeline and domain helpers
```

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
