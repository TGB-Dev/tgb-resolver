# tgb-resolver

- ICPC/DMOJ/VNOJ-style contest feed resolver
- Server-authoritative event timeline
- Single source of truth drives audience + control UIs

> [!NOTE]
> - Parsing code ported / referenced from [ICPC resolver](https://github.com/icpctools/icpctools/tree/main/Resolver)
> - Also referenced from [VNOI Resolver](https://github.com/VNOI-Admin/vnoi-resolver)
> - Thanks to the authors for their leaderboard-resolving algorithms

> [!WARNING]
> - VNOJ contest format only
> - See [vnoj.py](https://github.com/VNOI-Admin/OJ/blob/master/judge/contest_format/vnoj.py)

## Stack

- Workspace: Turborepo + pnpm workspaces
- Frontend: Vue 3.5 + Pinia + vue-router + Vite 8
- Styling: Panda CSS + Chakra preset + Ark UI + motion-v
- Server: Go 1.26+ + Gin + Huma v2 + coder/websocket + Bun ORM + modernc.org/sqlite + Wire DI
- Contracts: openapi-ts + ofetch + TanStack Query + Valibot + Protobuf (buf)
- Parsers: Go `features/importing` (server-side)
- Lint/Format: Biome + syncpack + go fmt
- Tests: Vitest + Testing Library (web) + Go testing (server)

## Prerequisites

- Node.js >= 24.15.0
- pnpm >= 11.1.3
- Go 1.26+

## Getting started

```sh
pnpm install
cp .env.example .env
```

- `VITE_API_URL` defaults to `http://localhost:5001`

## Development

```sh
pnpm dev
```

- Server: port 5001
- Web: port 3000
- `/`: Audience UI
- `/control`: Control UI
- Server code: `apps/server/`
- Frontend code: `apps/web/` (`@tgb-resolver/web`)

## Build and test

- `pnpm build`: Turborepo dependency-order build
- `pnpm check-types`: `tsc --noEmit` + `go vet`
- `pnpm test`: vitest + go test
- `pnpm serve`: production previews
- `pnpm format`: go fmt + Biome format
- See [AGENTS.md](./AGENTS.md) for the full command list

## Environment

- `PORT`: server port
  - Default: `5001`
- `ALLOWED_ORIGINS`: CORS origins
  - Default: `*`
- `DATA_DIR`: data directory
  - Default: `.data`
- `JOIN_CODE`: preset 6-char join code
  - Default: generated on first boot
  - Printed as `JOIN CODE: ...` in server log
- `SESSION_TTL_HOURS`: device session lifetime
  - Default: `30`
- `VITE_API_URL`: API base URL (frontend `.env`)
  - Default: `http://localhost:5001`

## Venue auth

- Shared venue network
- Every HTTP route requires a device token
- `/hubs/show` WebSocket requires a device token
- Join once via Auth tab in control panel
  - Lock icon
  - Visible in Live mode too
- Join UI shows:
  - QR magic link
  - Typable code
- Joining mints a random device token
- Token stored on the device
- Reconnects reuse the token silently
- Rotating join code never kicks connected devices
- Kick list drops one device back to Join screen
- Sessions persist in SQLite across restarts
- Join code persists in SQLite across restarts

## Structure

- `apps/server/`: Go HTTP/WebSocket server
- `apps/web/`: Vue 3 SPA frontend
  - `src/features/`: vertical feature slices
  - `control/`: playback, timeline, transport, cue tab
  - `leaderboard/`: leaderboard grid/table
  - `assets-manager/`: folder/file browser
  - `shared/`: show, realtime, confirm, fullscreen
  - `extensions/`: registry, config UI, server patch API
- `packages/contracts/`: OpenAPI-generated TS HTTP client + Query helpers + Valibot schemas
- `packages/realtime/`: Protobuf types + clock sync + timeline/domain helpers
- See [AGENTS.md](./AGENTS.md) for roles and ports
- See [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md) for system design

## Documentation

- [AGENTS.md](./AGENTS.md): architecture, conventions, tooling
- [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md): timeline, API, realtime, invariants
- [apps/web/QUICK_REF.md](./apps/web/QUICK_REF.md): frontend state, styling, tokens

## License

- MIT License
- Copyright (c) 2026 The Gifted Battlefield Organization

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
