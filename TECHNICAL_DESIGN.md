# TGB Resolver Technical Design

## Purpose

TGB Resolver imports ICPC/DMOJ contest feeds, produces an editable event
timeline, and drives audience and control UIs from one authoritative server
state.

The server owns persistence, contest conversion, playback state, versioning,
and realtime broadcasts. Clients render the state and submit versioned commands.

## Motivation

Unlike the VNOI Resolver (PixiJS + React, single window with keybinding
toggling between control/audience) and the ICPC Resolver (JVM-based, hardcoded
ICPC rules, high RAM usage), TGB Resolver decouples the two UIs by URL route
and replaces XML preprocessing with automatic server-side parsing.

The custom event system treats every action (resolve, image, SFX) as a typed
cue that can be triggered manually, automatically, or relative to another cue.
This enables MC-driven shows where cues stay "in the pocket" rather than
following a fixed NLE-style timeline. The UI is inspired by GrandMA3 —
a relative timeline with a main panel showing the current, next, and prior cues.

## System boundaries

- `apps/server/`: .NET 10 solution — server, parser, and tests.
  - `TGB.Resolver.Server`: API + SignalR host
  - `TGB.Resolver.IcpcXmlParser`: server-side ICPC XML parser
  - `TGB.Resolver.Server.Tests`, `TGB.Resolver.IcpcXmlParser.Tests`
- `apps/web/`: TanStack Router SPA — audience and control UIs
- `packages/contracts/`: OpenAPI-generated TS HTTP client, TanStack Query helpers, Valibot schemas
- `packages/realtime/`: client-side clock sync, timeline, and domain helpers

### Client-side architecture

The frontend (`apps/web/`) organizes state and UI into feature-sliced modules under `src/features/`:

- **`control/`** — playback model, timeline cursor, floating panel model + types. All control-domain state.
- **`leaderboard/`** — leaderboard state model.
- **`assets-manager/`** — folder/file browser model (already feature-local).
- **`shared/`** — cross-cutting models: show state, realtime connection, confirm dialogs, fullscreen toggle.

All models use `@preact/signals-react` — never React `useState`/`useReducer`/`createContext` for shared state. Import directly from a feature's model path (e.g. `@/features/control/playback-model`, `@/features/shared/show-model`).

## Engineering conventions

Use string-valued enums for finite domain vocabularies in TypeScript and .NET.
Do not introduce handwritten string unions for modes, status, event types, or
asset kinds. Generated OpenAPI contracts own REST/shared wire enums.
`packages/realtime` re-exports those enums; it must not redeclare them.

### Tech choices

| Decision                                     | Rationale                                                                                               |
|----------------------------------------------|---------------------------------------------------------------------------------------------------------|
| **Turborepo**                                | Pruned Docker images + caching; handles .NET + TS projects efficiently                                  |
| **Preact Signals (`@preact/signals-react`)** | Fine-grained reactivity; render display-only signals directly to skip React reconciliation on hot paths |
| **SignalR + MessagePack**                    | Smaller wire payload than JSON for realtime frames                                                      |
| **Source-generated JSON serializer**          | `JsonSourceGenerationOptions` for AOT-compatible serialization; keeps most endpoints at 8–9 ms         |
| **Feature-based server structure**           | Domain-organized endpoints, dtos, and services per feature                                              |

### Frontend rendering performance

`playbackModel.state` is the single object signal holding playback state; `currentEventId`,
`currentCueId`, and `status` are derived computed signals, and `currentCueId`
(identical to `currentEventId` — the `currentResolveEventId` rule was removed to fix a
double-highlight bug) is what the timeline highlight, scroll
target, and cue tab all read. Any `state.value` read subscribes to the whole
object, so it is the dominant re-render source. Conventions:

- Render display-only signals directly in JSX (`<>{signal}</>`) to patch the DOM
  without React reconciliation.
- Drive hot-path animations with `effect()` + imperative `animate()` (WAAPI),
  not declarative `motion/react` props bound to fast-changing signals.
- Keep hot-signal reads in small leaf components so large subtrees (timeline
  rows, transport controls, cue tab) do not re-render on playback ticks.
- `batch()` correlated writes; `peek()` for non-subscribing reads; wrap
  non-urgent react-query invalidations in `startTransition`.

### Tooling

- Run workspace tasks through Turborepo: `pnpm test`, `pnpm check-types`, `pnpm build`.
- Contract changes: the server `build` emits `openapi.yaml` automatically
  (`-p:GenerateOpenApiDocument=true`); `packages/contracts` consumes it at build
  time (`openapi-ts` → `tsdown`). The strongly-typed SignalR hub client in
  `packages/realtime/src/gen` is generated from the server's `IShowHubClient`
  interface via the `dotnet-tsrts` tool — the `connection.on(...)` handlers in
  `realtime.worker.ts` are written by hand on top of it.
- Biome (not ESLint/Prettier) for lint + format. syncpack for dependency consistency.
- `dotnet-outdated` (local tool in `apps/server/dotnet-tools.json`) lints/upgrades NuGet packages (
  `nuget:outdated` / `nuget:update`). `knip` (config `knip.json`) lints the TS packages for unused
  dependencies and exports.
- `verbatimModuleSyntax` enabled root-wide — always `import type` for type-only.
- The server solution uses `.slnx` format (not `.sln`).
- ReSharper CLI (`dotnet jb cleanupcode` + `inspectcode`) runs a .NET-only
  quality pass via `pnpm turbo run quality --filter=@tgb-resolver/server`.
- The pre-commit hook runs `sync:check || sync` → `test` → `biome check --write --staged --no-errors-on-unmatched` → `git add -u`.

### .NET test filter

Tests use TUnit (`[Test]`, `sealed class`, `await Assert.That(...)`) with
Microsoft.Testing.Platform. Filter by tree node, not VSTest:

```sh
dotnet run --project <test.csproj> -- --treenode-filter "/*/*/Class/*"
```

Two test projects: `TGB.Resolver.Server.Tests` and `TGB.Resolver.IcpcXmlParser.Tests`.

## Timeline

A timeline is an ordered list of typed events:

- `Res`, short name `RES`: reveal one team/problem resolution and its resulting score/rank.
- `Pre`, short name `PRE`: pre-resolve cue emitted before each `Res` so the frontend
  can focus on the upcoming resolution.
- `Img`, short name `IMG`: display an image asset.
- `Sfx`, short name `SFX`: request local sound playback.
- `Cus`, short name `CUS`: custom user-defined event with freeform payload.

Resolve events are generated by import. Their IDs, order, and resolve payloads
are immutable: they cannot be deleted or reordered. Presentation metadata may
be edited. Image and SFX events support full CRUD, including ordering.

Timeline access mode is an extensible enum. `RW` is the default; `RO` prevents
editing. Do not represent it as a Boolean.

## XML conversion

Import accepts XML and an optional list of excluded usernames. Excluded teams
and their runs are removed before any ranking or timeline calculation.

DMOJ/VNOI XML is score-based. The resolver preserves that model:

1. Before freeze, retain each team's maximum score per problem.
2. Rank by total score, then VNOI finish-time penalty, then team ID. Equal
   score/penalty entries retain a shared rank.
3. Record that result as the contest snapshot.
4. For each changed team/problem, retain the final score-altering run as its
   pending reveal.
5. Simulate reveals from the current bottom pending team; choose its leftmost
   pending problem by contest order.
6. Emit a `Pre` + `Res` pair per pending reveal (the `Pre` cue lets the frontend
   pre-focus on the upcoming resolution), including zero-score failures.

The conversion is deterministic. It does not implement ICPC Resolver's
optimizer or intentionally reorder events for dramatic effect.

## HTTP API

Import / export:

- `POST /import/xml`, `POST /import/bundle`
- `GET /export/bundle`
- `POST /api/show/optimize`, `POST /api/show/clear`

Timeline and assets:

- `GET /timeline`
- `POST /timeline/event`
- `PATCH /timeline/event/:id`, `PATCH /timeline/event/:id/position`, `DELETE /timeline/event/:id`
- `PATCH /timeline/mode`
- `PATCH /api/show/events/resolve/:id`, `PATCH /api/show/events/non-resolve/:id`
- `GET /assets/:id`, `POST /assets/:id`
- `DELETE /assets/entries/{id}`, `PATCH /assets/entries/{id}`
- `POST /assets/folders`
- `PATCH /assets/{assetId}/move`

Playback and show control:

- `POST /playback/seek`, `POST /api/playback/start`, `POST /api/playback/reset`
- `POST /api/show/live`, `DELETE /api/show/live`
- `PATCH /api/show/automation`

Every mutation includes the snapshot version observed by the caller. The server
rejects stale versions. A rejected client fetches the latest snapshot; it never
merges state locally.

## Realtime and clock sync

The server is authoritative for playback. It persists the cursor before
broadcasting. Clients do not advance the timeline independently.

### Clock synchronization

Inspired by NTP/SMPTE-timecode principles, adapted for venue networks that
cannot reliably carry SMPTE 2110. Timing is anchored to the server clock:

1. Client sends a SignalR request with its `int64` UTC Unix milliseconds.
2. Server replies with `receivedAt` and `transmittedAt`.
3. After eight request/response pairs, the client selects the lowest-RTT sample.
4. That sample is anchored to `performance.now()` for drift-resistant projection.
5. Resync every 10 seconds and after reconnect.

Control clients must complete clock sync before issuing playback commands.
Audience clients hold their last confirmed state while disconnected.

### Playback

- Supports forward seek, backward seek, and jump to any event ID.
- Server atomically replaces cursor, cancels prior schedule, and broadcasts
  durable state.
- Clients cancel local schedules and render the target state; they do not
  replay skipped transient effects (e.g. SFX).
- Playback messages carry snapshot version, event ID, and
  server execution time. Clients ignore duplicate/older messages.
- A timeline version gap triggers a full snapshot resync.

Client connection lifecycle:
`Idle → Connecting → Connected → Reconnecting → Disconnected → Failed`

SFX is best-effort: each receiving client plays it on event delivery. Exact
cross-client audio synchronization and replay of missed audio are out of scope.

## Invariants

- A persisted snapshot version is monotonically increasing.
- A client only mutates from a current snapshot.
- The server serializes playback transitions.
- Reconnection always converges through an authoritative snapshot.
- The same XML input and exclusions produce the same generated timeline.
