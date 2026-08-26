# tgb-resolver

## Frontend status

`apps/web/` is the canonical (and only) frontend — a Vue 3 SPA (Pinia, Panda CSS + Chakra
preset, Ark UI, vue-router, motion-v). There is no `apps/web-vue` directory and no React/legacy
app. Vue components must use generated styled-system JSX factories and recipes for styling; do
not recreate Chakra component styles with bespoke CSS when a Panda recipe exists.

## Commands

- `pnpm dev` — run all apps in parallel (server + web)
- `pnpm build` — builds through Turborepo respecting dependency graph
- `pnpm test` — runs all vitest projects + `dotnet test` for .NET
- `pnpm check-types` — `tsc --noEmit` for all TS packages
- `pnpm format` / `pnpm lint` / `pnpm check` — Biome (not ESLint/Prettier)
- `pnpm serve` — run production previews
- `pnpm sync` / `pnpm sync:check` — syncpack dependency consistency
- `pnpm knip` — knip unused dependency/export/asset check across the workspace (config: `knip.json`)
- `pnpm turbo run nuget:outdated --filter=@tgb-resolver/server` — list outdated NuGet packages
- `pnpm turbo run nuget:update --filter=@tgb-resolver/server` — upgrade NuGet packages to latest
  compatible
- `pnpm hooks:install` — point git at `.githooks` path (Husky manages hooks via `.husky/`; only
  needed if you opt out of Husky)
- `pnpm turbo run quality --filter=@tgb-resolver/server` — ReSharper `cleanupcode` + `inspectcode`
  SARIF report (slow, .NET-only quality pass)
- OpenAPI `openapi.yaml` is generated automatically by the server `build` (runs
  `dotnet build -p:GenerateOpenApiDocument=true`); no separate command needed.

Pre-commit hook runs: `sync:check || sync` → `test` → `biome check --write --staged --no-errors-on-unmatched` → `git add -u`.

## Structure

| Path                  | Role                                                                                                               |
|-----------------------|--------------------------------------------------------------------------------------------------------------------|
| `apps/server/`        | .NET 10 solution (FastEndpoints, SignalR, EF Core Sqlite, NSwag, Mapperly). Solution: `.slnx` format               |
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
- **OpenAPI regeneration**: emitted by the server `build` (
  `dotnet build -p:GenerateOpenApiDocument=true`);
  `pnpm turbo run build --filter=@tgb-resolver/server` regenerates `openapi.yaml`. No separate
  `openapi` task.
- **Biome** (v2.5.10): `recommended` preset, 100 col, 2-space. `organizeImports` grouped: react-scan
  blank package blank alias blank path. Ignores `*.gen.ts`
- **syncpack**: checks dependency consistency across the workspace (no explicit config file;
  runs with defaults)
- **Env**: `.env` → `VITE_API_URL` (default `http://localhost:5001`). Copy from `.env.example`
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

- **Vitest workspace** covers `packages/*` and `apps/*` (see `vitest.workspace.ts`). All TS packages
  use `--passWithNoTests`.
- **.NET tests** use TUnit (`[Test]`, not `[Fact]`). Tests are `sealed class` with
  `await Assert.That(...)`. Run via `dotnet test`, not VSTest.
  - Filter: `dotnet run --project <test.csproj> -- --treenode-filter "/*/*/Class/*"`
  - Two test projects: `TGB.Resolver.Server.Tests` and `TGB.Resolver.IcpcXmlParser.Tests`

## .NET specifics

- Target: `net10.0`, SDK 10.0
- Solution format: `.slnx` (new XML-based format), not `.sln`
- Turborepo: `@tgb-resolver/server` package at `apps/server/package.json` wraps the .NET toolchain;
  `apps/server/turbo.json` declares .NET build outputs. Tasks: `build` (also emits `openapi.yaml`),
  `test`, `dev`, `serve`, `check-types`, `quality`, `generate`
- `dotnet-tools.json` at `apps/server/dotnet-tools.json` — ReSharper CLI (`dotnet tool run jb` →
  `cleanupcode` + `inspectcode`) and `typedsignalr.client.typescript.generator` (
  `dotnet tool run dotnet-tsrts`, the SignalR hub client generator)
- SQLitePCLRaw pinned to 3.0.3 (temp workaround for efcore vulnerability)
- `ExportSwaggerDocsAndExitAsync("v1")` in `Program.cs` generates `openapi.yaml` at startup
- Scalar API reference at `/scalar`, Swagger JSON at `/openapi/{documentName}.json`

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
- **`dotnet-tsrts`** (`typedsignalr.client.typescript.generator`) — generates the strongly-typed
  SignalR hub client (`packages/realtime/src/gen`) from the server's `IShowHubClient` interface. Run
  via `pnpm --filter @tgb-resolver/realtime generate`. This is the source of truth for the client
  `HubConnectionBuilder` types; the `connection.on(...)` handlers in `realtime.worker.ts` are written by hand on
  top of it.
- **`tsdown`** — bundles `packages/contracts` and `packages/realtime` to `dist/`.
- **`dotnet-outdated`** — NuGet dependency linter/upgrader, installed as a local tool in
  `apps/server/dotnet-tools.json`. `nuget:outdated` lists upgradable packages; `nuget:update`
  applies them (`-u`). Run via `pnpm turbo run nuget:outdated --filter=@tgb-resolver/server`.
- **`knip`** — workspace-wide unused dependency/export/asset linter for the TS packages; config at
  `knip.json` (ignores generated `*.gen.ts`, `src/generated`, `src/gen`, and CSS-imported font
  packages). Run via `pnpm knip`. The root vitest error is suppressed via `vitest: { config: [] }`
  in the root workspace.
- **ReSharper CLI** (`dotnet jb cleanupcode` + `inspectcode` → SARIF) — .NET-only quality pass via
  `pnpm turbo run quality --filter=@tgb-resolver/server`.
- **Pre-commit hook** (`.husky/pre-commit`) — `sync:check || sync` →
  `test` → `biome check --write --staged --no-errors-on-unmatched` → `git add -u`.

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

The server `IShowHubClient` interface in `Features/Realtime/RealtimeContracts.cs` is the **single
source of truth** for all hub messages. Every server-to-client SignalR message MUST be declared as a
method on that interface.

### Adding a new realtime message

Adding a new realtime message requires touching exactly five places, in order:

1. **Server — `IShowHubClient`** (`apps/server/TGB.Resolver.Server/Features/Realtime/RealtimeContracts.cs`)
   Add the method signature, e.g.:
   ```csharp
   Task MyNewMessage(MyNewMessageMessage message);
   ```
   Add the message record, e.g.:
   ```csharp
   public sealed record MyNewMessageMessage(int ShowVersion, string SomeData);
   ```

2. **Server — `ShowService.cs`** (`apps/server/TGB.Resolver.Server/Features/Show/ShowService.cs`, or wherever you broadcast)
   Call the method:
   ```csharp
   await hubContext.Clients.All.MyNewMessage(new MyNewMessageMessage(...));
   ```

3. **Client — `realtime.worker.ts` + `lib/show-message-mapper.ts`** (register the
   SignalR handler). Add a `connection.on("MyNewMessage", ...)` block in
   `apps/web/src/lib/realtime.worker.ts` that calls `mapMyNewMessage(...)` from
   `apps/web/src/lib/show-message-mapper.ts` and posts the `ShowWebSocketMessage` variant.
   `callbacks.onMessage(...)`.

4. **Client — `types.ts` (`packages/realtime/src/types.ts`)**
   Add the variant to the `ShowWebSocketMessage` discriminated union:
   ```typescript
   | { type: "my-new-message"; showVersion: number; someData: string }
   ```

5. **Client — `realtime-handler.ts`** (`apps/web/src/features/control/realtime-handler.ts`)
   Handle the new message type in the `if` chain inside `applyControlRealtimeMessage`.

### Message type naming

| Layer                   | Convention                | Example                       |
|-------------------------|---------------------------|-------------------------------|
| C# interface method     | PascalCase, verb-noun     | `PlaybackStateChanged`        |
| C# message record       | `{Noun}Message` suffix    | `PlaybackStateChangedMessage` |
| SignalR wire event name | Exact C# method name      | `"PlaybackStateChanged"`      |
| TypeScript message type | kebab-case of the C# name | `"playback-state-changed"`    |

### Verification rules

- Every `IShowHubClient` method MUST have a corresponding `connection.on(...)` in `realtime.worker.ts`.
- Every `connection.on(...)` handler MUST produce a `ShowWebSocketMessage` variant.
- Every `ShowWebSocketMessage` variant MUST be handled in `applyControlRealtimeMessage`.
- The `ShowWebSocketMessage` union type MUST NOT contain variants with no server counterpart.
- The server `ShowRefetchReason` enum and client `reason` field MUST stay in sync.
