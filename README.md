# tgb-resolver

ICPC/DMOJ event feed-compatible contest scoreboard resolver. Animates the progression of XML contest feeds - teams solving problems, leaderboard shifts.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TanStack Start, Chakra UI 3, Zustand, Motion |
| Server | Elysia (ElysiaJS), TypeBox |
| Parser | fast-xml-parser (ICPC XML → typed JSON) |
| Monorepo | pnpm workspaces, Turborepo |
| Lint/Format | Biome, syncpack |
| Tests | Vitest, Testing Library |

## Prerequisites

- Node.js >= 24.15.0
- pnpm >= 11.1.3

## Getting Started

```sh
pnpm install
cp .env.example .env   # VITE_API_URL defaults to http://localhost:5001
```

### Development

```sh
pnpm dev
```

Server runs on `:5001`, web on `:3000`.

### Build

```sh
pnpm build
```

### Test

```sh
pnpm test
```

### Production Serve

```sh
pnpm build && pnpm serve
```

## Structure

```
apps/
  server/          - Elysia API server
  web/             - TanStack Start React app
packages/
  icpc-xml-parser/ - Contest XML to typed data
```

## Scripts

| Command | Action |
|---|---|
| `pnpm dev` | Dev mode (all apps, watch) |
| `pnpm build` | Build all packages + apps |
| `pnpm test` | Run all tests |
| `pnpm serve` | Production serve |
| `pnpm lint` | Biome lint --write |
| `pnpm format` | Biome format --write |
| `pnpm check` | Biome lint + format + organize imports |
| `pnpm check-types` | TypeScript type check |
| `pnpm sync` | syncpack fix + format (dependency sync) |
