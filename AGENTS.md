# tgb-resolver

## Architecture

**Server**: Go 1.26+ using Gin (HTTP), Huma v2 (REST/OpenAPI), coder/websocket (WebSocket), Bun (SQLite ORM), Wire (DI)
**Frontend**: Vue 3 SPA (Pinia, Panda CSS + Chakra preset, Ark UI, vue-router, motion-v)

`apps/web/` is the canonical (and only) frontend. There is no `apps/web-vue` directory and no React/legacy
app. Vue components must use generated styled-system JSX factories and recipes for styling; do
not recreate Chakra component styles with bespoke CSS when a Panda recipe exists.

## Commands

- `pnpm dev` — run all apps in parallel (server + web)
- `pnpm build` — builds through Turborepo respecting dependency graph
- `pnpm test` — runs all vitest projects + Go tests
- `pnpm check-types` — `tsc --noEmit` for all TS packages
- `pnpm format` — runs `go fmt` for Go + Biome format for TS/Vue (via Turbo)
- `pnpm lint` / `pnpm check` — Biome (not ESLint/Prettier)
- `pnpm serve` — run production previews
- `pnpm sync` / `pnpm sync:check` — syncpack dependency consistency
- `pnpm knip` — knip unused dependency/export/asset check across the workspace (config: `knip.json`)
- `pnpm hooks:install` — point git at `.githooks` path (Husky manages hooks via `.husky/`; only
  needed if you opt out of Husky)
- OpenAPI `openapi.yaml` is generated automatically by the server `build` (runs `go run . --dump-openapi openapi.yaml`)

Pre-commit hook runs: `sync:check || sync` → `turbo run format --filter=@tgb-resolver/server` → `turbo run test` → `biome check --write --staged --no-errors-on-unmatched` → `git add -u`.

## Structure

| Path                  | Role                                                                                                               |
|-----------------------|--------------------------------------------------------------------------------------------------------------------|
| `apps/server/`        | Go 1.26+ HTTP/WebSocket server (Gin, Huma v2, coder/websocket, Bun ORM, modernc.org/sqlite). Default port 5001    |
| `apps/web/`           | Canonical Vue 3 SPA (Pinia, TanStack Vue Query, Panda CSS + Chakra preset, Ark UI, vue-router). Dev port 3000      |
| `apps/web/src/features/` | 5 feature-sliced UI modules, each owning their own Pinia stores |
| `apps/web/src/features/control/` | Stores: playback, control-now, floating-panel (+types). UI: timeline, transport, cue tab |
| `apps/web/src/features/leaderboard/` | Stores: leaderboard. UI: grid/table views |
| `apps/web/src/features/assets-manager/` | Store: assets-manager. UI: folder/file browser with tree view |
| `apps/web/src/features/shared/` | Stores: show, realtime, confirm-action, fullscreen. UI: shared components |
| `apps/web/src/features/extensions/` | Registry: base types + `extensionRegistry`. UI: extension config panel |
| `packages/contracts/` | OpenAPI-generated TS HTTP client + TanStack Query + Valibot schemas. Generated from `apps/server/.../openapi.yaml` |
| `packages/realtime/`  | Client-side clock sync, timeline and domain helpers. Re-exports contracts enums; must not redeclare them           |

Workspace packages: `@tgb-resolver/*`.

## Conventions

- **`verbatimModuleSyntax`** enabled root-wide — always use `import type` for type-only imports
- **Prefer direct type annotations over `satisfies`** for `const` declarations that need a
  specific type. Write `const foo: readonly T[] = [...]` (or `const foo: T = {...}`), not
  `const foo = [...] satisfies T`. A direct annotation gives the variable that exact type
  (so callers and downstream `Record<K, V>` index access see the intended shape), whereas
  `satisfies` only checks and leaves the variable with its (often wider) inferred type. Use
  `satisfies` only when you need to preserve a narrower inferred type while still type-checking
  against a target.
- **String-valued enums** for domain vocabularies (not string unions). Contracts owns wire enums;
  realtime re-exports them. The frontend keyboard-shortcut command system in
  `apps/web/src/features/shortcuts/` defines `CommandScope` and `CommandBindingKind` enums in
  `types.ts`; command `scope` and binding `kind` MUST use these enum members (never raw string
  literals). Adding a new scope or binding kind requires adding a member to the enum AND updating
  the `satisfies` checks / discriminated unions in `types.ts`.
- **Contracts build**: `pnpm run generate` (openapi-ts) → `tsdown`. Depends on current
  `openapi.yaml`
- **OpenAPI regeneration**: emitted by the server `build` (`go run . --dump-openapi openapi.yaml`);
  `pnpm turbo run build --filter=@tgb-resolver/server` regenerates `openapi.yaml`.
- **Biome** (v2.5.10): `recommended` preset, 100 col, 2-space. `organizeImports` grouped: react-scan
  blank package blank alias blank path. Ignores `*.gen.ts`
- **syncpack**: checks dependency consistency across the workspace (no explicit config file;
  runs with defaults)
- **`Record<K, V>` over `Map<K, V>`** for immutable look-up structures (returned values,
  lookup tables, index maps like `userById`, `problemById`). Only use `Map<K, V>` when the
  structure requires mutability after creation. `Record` reduces GC pressure, allocations,
  and is 5-10× faster for creation and look-ups.
- **Grid over Table** for tabular layouts — render a list of CSS Grid rows instead of an
  HTML `<table>`. This scopes reflows to individual rows and avoids the costly style
  propagation across many cells. Use the shared `gridTableTemplate()` helper from
  `apps/web/src/features/shared/ui/grid-table.ts`. Reference
  implementation: `apps/web/src/features/control/timeline/timeline-table.vue` (generalize
  for any future table including the leaderboard).

### Unity FsEntry pattern (Assets Manager)

The assets manager treats folders and files uniformly as `FsEntry` (UNIX-style) with
`isDirectory: boolean` discriminant. All server endpoints and client state mirror this:

- **Server**: `DELETE /assets/entries/{id}`, `PATCH /assets/entries/{id}` accept
  `{ showVersion, isDirectory }` in the body — single endpoint for both folders and files.
- **Contracts**: `deleteEntryEndpoint`, `renameEntryEndpoint` replacing separate
  folder/asset endpoints.
- **Client store** (`assets-manager-store.ts`): `selectedEntryId` (navigation cursor),
  multi-select state, and an `entries` getter (merges child folders + belonging files).
  `FsEntry` defined in `apps/web/src/features/assets-manager/types.ts`.
- **Views**: single `EntryCard`/`EntryRow` (grid/list), single `EntryMenu` (context menu).
  No bifurcated folder vs asset components.
- **Tree view**: `Folder`/`FolderOpen` icons (no chevron), click toggles expand. `useComputed`
  per-node for reactive subscriptions.
- **Selection semantics**: single-click → select/highlight, double-click → navigate/open.
  Modifier + click for multi-select; click outside deselects all.

### Frontend state (Vue canonical frontend)

- Shared and feature state uses Pinia setup stores with `ref` and `computed`; do not introduce
  React state patterns into `apps/web`.
- **Follow Vue's lifecycle and rendering model, not React's.** Use Vue's own reactivity
  (`ref`/`computed`/`watch`/`watchEffect`) and template-driven rendering. Do **not** port React/Preact
  philosophy: no `createModel`/signal-as-source-of-truth, no `effect()`-driven DOM patching, no
  `batch()`/`peek()` from Preact. Render reactive values in the template and let Vue's compiler handle
  updates; drive hot-path animation imperatively via `motion-v`/vanilla `motion` WAAPI in leaf components.
- **Vue 3.5+ primitives.** We target Vue 3.5+, so prefer the built-in primitives over hand-rolled
  helpers: `useTemplateRef` (the modern replacement for `templateRef`) for template refs, `defineModel`
  for v-model-compatible props, `useId` for stable unique ids, and `watchPostEffect`/`watchSyncEffect`
  where needed. Avoid deprecated callback-ref / `templateRef` workarounds.
- **Check VueUse first.** `@vueuse/core` is already a dependency. Before hand-writing utilities
  (debounce/throttle, storage, clipboard, element visibility/resize, on-click-outside, etc.), prefer the
  matching VueUse composable.
- Use `@tanstack/vue-query` for server cache and async mutations.
- Use generated `@styled-system/jsx` components for layout and generated Chakra Panda recipes
  for component anatomy. Ark UI primitives must receive the corresponding generated slot recipe
  classes; Ark primitives do not accept styled-system layout props.
- Merge recipe and atomic overrides with Panda `cx(recipe(...), css(...))`, not string concatenation
  or bespoke scoped CSS. Use Panda conditional styles (`_hover`, `_disabled`, `_selected`, etc.)
  for state styling.
- **Read the styling docs before styling work.** Fetch and read the official docs for our styling stack:
  - **Panda CSS** — https://panda-css.com/docs (full-text dump: https://panda-css.com/llms-full.txt)
  - **Ark UI (Vue)** — https://ark-ui.com/ (Vue docs under `/vue/docs`; source repo `chakra-ui/ark`)
  - **Chakra UI panda preset** — `@chakra-ui/panda-preset`, whose source lives in the Chakra GitHub
    repo at `chakra-ui/chakra-ui` (`packages/panda-preset`); it provides the Chakra-aligned tokens,
    recipes, and slot recipes we consume via `presets: ["@chakra-ui/panda-preset"]`.
- Use `motion-v`/vanilla `motion` for animation and keep hot-path animation imperative.

## Testing

- **Vitest workspace** covers `packages/*` and `apps/web` (see `vitest.workspace.ts`). All TS packages
  use `--passWithNoTests`.
- **Go tests** use standard `testing` package. Run via `go test ./...` or `pnpm --filter @tgb-resolver/server test`

## Go specifics

- Go version: 1.26+
- Turborepo: `@tgb-resolver/server` package at `apps/server/package.json` wraps the Go toolchain;
  `apps/server/turbo.json` declares build outputs. Tasks: `build` (also emits `openapi.yaml`),
  `test`, `dev`, `serve`, `generate`
- **Dependency injection**: Google Wire (`wire.go`, `wire_gen.go`, `wire_providers.go`)
- **Database**: Bun ORM with modernc.org/sqlite (pure-Go, no CGO)
- **HTTP**: Gin router + Huma v2 (OpenAPI generation, validation)
- **WebSocket**: `github.com/coder/websocket` for `/hubs/show` endpoint
- **Protobuf**: `buf` generates Go + TypeScript from `proto/show/v1/*.proto`
- Scalar API reference at `/scalar`, OpenAPI spec at `/openapi`
- CORS: defaults to `*` (all origins), configurable via `ALLOWED_ORIGINS` env var

## Automated tooling

The repo relies on several codegen/quality tools that run automatically as part of the build and
pre-commit flow. Do not hand-edit their generated output.

- **Turborepo** — task orchestration, caching, and dependency-ordered builds across the pnpm
  workspace.
- **Biome** (lint + format) and **syncpack** (dependency-version consistency) — run on pre-commit
  and via `pnpm check` / `pnpm sync:check`.
- **`openapi-ts`** (`@hey-api/openapi-ts`) — generates the `packages/contracts` HTTP client,
  TanStack Query helpers, and Valibot schemas from `openapi.yaml`. Output is `*.gen.ts` (
  Biome-ignored). Run via `pnpm --filter @tgb-resolver/contracts generate`.
- **`buf`** — Protobuf compiler. Generates Go server types (`apps/server/proto/gen`) and TypeScript
  client types (`packages/realtime/src/proto/gen`) from `.proto` files. Run via
  `pnpm --filter @tgb-resolver/realtime generate` or `buf generate` in `apps/server/`.
- **`tsdown`** — bundles `packages/contracts` and `packages/realtime` to `dist/`.
- **`knip`** — workspace-wide unused dependency/export/asset linter for the TS packages; config at
  `knip.json` (ignores generated `*.gen.ts`, `src/generated`, `src/gen`, and CSS-imported font
  packages). Run via `pnpm knip`. The root vitest error is suppressed via `vitest: { config: [] }`
  in the root workspace.
- **Wire** (`github.com/google/wire`) — Go dependency injection codegen. Generates `wire_gen.go`
  from `wire.go` and `wire_providers.go`. Run automatically during `build`.
- **Pre-commit hook** (`.husky/pre-commit`) — `sync:check || sync` → `go fmt` (server only) →
  `test` (all packages) → `biome check --write --staged --no-errors-on-unmatched` → `git add -u`.

<!-- turbo configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Turborepo

- Task graph is declared in `turbo.json` at the repo root; per-package overrides live in
  `*/turbo.json` (e.g. `apps/server/turbo.json`).
- When running tasks (build, lint, test, etc.), use `turbo run <task>` through the workspace package
  manager (e.g. `pnpm turbo run build`, `pnpm turbo run test --filter=@tgb-resolver/web`).
- Filter by package with `--filter` (`pnpm turbo run build --filter=@tgb-resolver/server`).
- NEVER guess CLI flags - always check `turbo --help` or the Turborepo docs first when unsure.

<!-- turbo configuration end-->

## Realtime Contracts

The server Protobuf definitions in `apps/server/proto/show/v1/show.proto` are the **single
source of truth** for all WebSocket messages. The server broadcasts Protobuf-encoded `Envelope`
messages over WebSocket at `/hubs/show`.

### Adding a new realtime message

Adding a new realtime message requires touching exactly four places, in order:

1. **Server — Protobuf** (`apps/server/proto/show/v1/show.proto`)
   Add the message type to the `Envelope` oneof:
   ```protobuf
   message Envelope {
     string type = 1;
     oneof payload {
       MyNewMessage my_new_message = 8;
     }
   }
   message MyNewMessage {
     int32 show_version = 1;
     string some_data = 2;
   }
   ```
   Run `buf generate` to regenerate Go + TypeScript types.

2. **Server — Broadcast** (`apps/server/features/show/*.go` or `features/realtime/orchestrator.go`)
   Create and broadcast the envelope:
   ```go
   h.Hub.Broadcast(&showv1.Envelope{
     Type: "MyNewMessage",
     Payload: &showv1.Envelope_MyNewMessage{
       MyNewMessage: &showv1.MyNewMessage{
         ShowVersion: version,
         SomeData: "...",
       },
     },
   })
   ```

3. **Client — `realtime.worker.ts`** (`apps/web/src/lib/realtime.worker.ts`)
   Add a case to the `handleEnvelope` switch to decode and post the message:
   ```typescript
   case ShowMessageType.MyNewMessage: {
     if (payload.case !== "myNewMessage") return;
     post({
       type: RealtimeWorkerResponseType.Message,
       message: {
         type: ShowMessageType.MyNewMessage,
         showVersion: payload.value.showVersion,
         someData: payload.value.someData,
       },
     });
     break;
   }
   ```
   Also add the wire-to-enum mapping in `ws-client.ts` `wireToMessageType`.

4. **Client — `realtime-handler.ts`** (`apps/web/src/features/control/realtime-handler.ts`)
   Handle the new message type in the `if` chain inside `applyControlRealtimeMessage`.

### Verification rules

- Every `Envelope` payload variant MUST have a corresponding case in `realtime.worker.ts` `handleEnvelope`.
- Every handled message MUST produce a `ShowWebSocketMessage` variant in `packages/realtime/src/types.ts`.
- Every `ShowWebSocketMessage` variant MUST be handled in `applyControlRealtimeMessage`.
