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

- `apps/server/`: Go 1.26+ server — HTTP/WebSocket, parsing, and tests.
  - `features/importing`: ICPC XML parser (`encoding/xml`) + resolver engine
  - `features/show`: show state, timeline, playback, import/export (Huma + Gin handlers + Bun store)
  - `features/assets`: asset filestore (`.data/assets`) + bundle zip (`archive/zip` + `zeebo/xxh3`)
  - `features/realtime`: `Clock` (ticker + heap), `Orchestrator`, `Hub` (`coder/websocket` + Protobuf `Envelope`)
  - `features/shared/config`: Viper config (`PORT`, `ALLOWED_ORIGINS`, `DATA_DIR`)
  - `proto/show/v1/show.proto`: single source of truth for all WS messages
- `apps/web/`: canonical Vue 3 SPA (package `@tgb-resolver/web`) — audience and control UIs
- `packages/contracts/`: OpenAPI-generated TS HTTP client, TanStack Query helpers, Valibot schemas
- `packages/realtime/`: Protobuf-generated types, `ws-client.ts`, clock sync helpers, timeline and domain helpers

### Client-side architecture

The canonical frontend (`apps/web/`) organizes state and UI into feature-sliced modules under `src/features/`:

- **`control/`** — playback store, timeline cursor, multi-panel floating panel store + types (handle-based). All control-domain state.
- **`leaderboard/`** — leaderboard state store.
- **`assets-manager/`** — folder/file browser store (already feature-local).
- **`shared/`** — cross-cutting stores: show state, realtime connection, confirm dialogs, fullscreen toggle.
- **`extensions/`** — extension base types, static registry (`extensionRegistry`), config UI, and the `patchExtensionPayload` server-patch API.

Vue feature state uses Pinia setup stores and Vue's fine-grained `ref`/`computed` reactivity. Shared Vue state is imported from Pinia stores (for example `@/features/control/playback-store` and `@/stores/show-store`).

## Engineering conventions

Use string-valued enums for finite domain vocabularies in TypeScript and Go.
Do not introduce handwritten string unions for modes, status, event types, or
asset kinds. Generated OpenAPI contracts own REST/shared wire enums.
`packages/realtime` re-exports those enums; it must not redeclare them.

### Tech choices

| Decision                                     | Rationale                                                                                               |
|----------------------------------------------|---------------------------------------------------------------------------------------------------------|
| **Turborepo**                                | Pruned builds + caching across the pnpm workspace                                                       |
| **Pinia + Vue reactivity**                   | Fine-grained state updates with feature-owned setup stores and computed derivations                     |
| **Panda CSS + Chakra preset**                | Generated recipes, slot recipes, atomic classes, and conditional styles for consistent visual fidelity  |
| **Ark UI Vue**                               | Accessible headless behavior, always bound to the corresponding Panda slot recipe                       |
| **Protobuf + coder/websocket**               | Smaller wire payload than JSON; binary `Envelope` frames on `/hubs/show`                                |
| **Huma v2 + Gin**                            | Typed handlers + OpenAPI generation; Gin router; Scalar docs at `/scalar`, spec at `/openapi`           |
| **Bun ORM + modernc.org/sqlite**             | Pure-Go SQLite (no CGO); single `show_states` row; trivial Docker/Turbo usage                           |
| **https://github.com/goforj/wire**           | Compile-time DI; provider sets per feature (`wire.go` → `wire_gen.go`)                                  |
| **Feature-based server structure**           | Domain-organized handlers, dtos, and services per feature                                               |

### Frontend rendering performance

`usePlaybackStore().state` is the single `ref` holding playback state; `currentEventId`,
`currentCueId`, and `status` are derived `computed`s, and `currentCueId`
(identical to `currentEventId` — the `currentResolveEventId` rule was removed to fix a
double-highlight bug) is what the timeline highlight, scroll
target, and cue tab all read. Reading `state.value` subscribes to the whole
object, so it is the dominant re-render source. Conventions:

- Keep hot-state reads in small leaf components so large subtrees (timeline
  rows, transport controls, cue tab) do not re-render on playback ticks.
- Drive hot-path animations with `motion-v`/vanilla `motion` + imperative WAAPI
  `animate()`, not declarative props bound to fast-changing state.
- Use Vue `computed` for derived values; batch correlated writes and keep
  store mutations granular to limit re-render scope.

### Tooling

- Run workspace tasks through Turborepo: `pnpm test`, `pnpm check-types`, `pnpm build`.
- Contract changes: the server `build` emits `openapi.yaml` automatically
  (`go run . --dump-openapi openapi.yaml`); `packages/contracts` consumes it at build
  time (`openapi-ts` → `tsdown`). The Protobuf types in `apps/server/proto/gen` and
  `packages/realtime/src/proto/gen` are generated via `buf generate` (`buf.yaml` + `buf.gen.yaml`).
- Biome (not ESLint/Prettier) for lint + format. syncpack for dependency consistency.
- `knip` (config `knip.json`) lints the TS packages for unused dependencies and exports.
- `verbatimModuleSyntax` enabled root-wide — always `import type` for type-only.
- `gofmt` + `go vet` for Go formatting and static analysis (`pnpm --filter @tgb-resolver/server run format/check-types`).
- Wire (`github.com/google/wire`) is the Go DI codegen — `wire_gen.go` is committed and regenerated via `go run github.com/google/wire/cmd/wire ./...`.
- The pre-commit hook runs `sync:check || sync` → `turbo run format --filter=@tgb-resolver/server` → `test` → `biome check --write --staged --no-errors-on-unmatched` → `git add -u`.

### Go tests

Tests use the standard `testing` package:

```sh
# internally run go test ./...
pnpm --filter @tgb-resolver/server test
```

Features own their tests (`features/importing/*_test.go`, `features/show/*_test.go`, `features/realtime/*_test.go`, `features/shared/domain/*_test.go`).

## Timeline

A timeline is an ordered list of typed events:

- `Res`, short name `RES`: reveal one team/problem resolution and its resulting score/rank.
- `Pre`, short name `PRE`: pre-resolve cue emitted before each `Res` so the frontend
  can focus on the upcoming resolution.
- `Cus`, short name `CUS`: custom user-defined event with freeform payload (`extId` + `extPayload`).

Resolve events are generated by import. Their IDs, order, and resolve payloads
are immutable: they cannot be deleted or reordered. Presentation metadata may
be edited. Custom (`Cus`) events support full CRUD, including ordering.

Two orthogonal modes:

- `ShowMode`: `Editing` (default) vs `Live` — controls whether the show is broadcast as live.
- `TimelineMode`: `Rw` (default, read-write) vs `Ro` (read-only, prevents editing). Do not represent either as a Boolean.

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

All mutations are versioned: the caller sends the `showVersion` it observed and
the server rejects stale versions with `409 Conflict` (`ErrVersionDrift`). A
rejected client fetches the latest snapshot; it never merges state locally.

Import / export:

- `POST /import/xml` — import ICPC/DMOJ XML (`{ xml, excludedUsernames }`)
- `POST /import/bundle` — import zipped bundle (base64 `bytes`, 1 GB limit, 10 min read timeout)
- `POST /import/xml/users` — preview users from XML without importing
- `GET /export/bundle` — export bundle as `[]byte` (zip + xxh3)

Show and timeline:

- `GET /timeline` — current `ShowState` snapshot
- `POST /api/show/optimize`, `POST /api/show/clear` — optimize (deduplicate) / clear show
- `PATCH /api/show/events/resolve/{id}` — rename a resolve event (`customName`)
- `PATCH /api/show/events/non-resolve/{id}` — patch a non-resolve (custom) event (`triggerOffsetSeconds`, `requireManualInteraction`, `customName`, `custom`)
- `POST /timeline/event` — create custom event (relative to another event, `before` flag)
- `PATCH /timeline/event/{id}`, `PATCH /timeline/event/{id}/position`, `DELETE /timeline/event/{id}` — patch / move / delete custom events
- `PATCH /timeline/mode` — set `timelineMode` (`Rw` / `Ro`)
- `GET /assets/:id`, `POST /assets/:id` (multipart via `assets/handlers.go`), `DELETE /assets/entries/{id}`, `PATCH /assets/entries/{id}`, `POST /assets/folders`, `PATCH /assets/{assetId}/move`

Auth (single shared join code minted into per-device tokens, BLAKE3-hashed at rest):

- `POST /auth/join` — exchange join code for a device token + `foo-bar` label (rate-limited)
- `GET /auth/join-code` — current code (Bearer, or loopback without a token for first setup)
- `POST /auth/rotate` — new join code, existing sessions survive
- `GET /auth/sessions` — device list (label, last seen, expiry)
- `DELETE /auth/sessions/{id}` — revoke one device (kicks its live socket with WS close 4401)
- `/hubs/auth` — presence hub (token-gated protobuf socket, `proto/auth/v1`):
  binary `AuthUpdate` frames (`sessions-changed`, `join-code-changed`) so open
  Auth tabs refresh live; sessions carry an `online` flag (socket-connected
  counts as now, plus a 10s grace on last seen)

Playback and show control:

- `POST /playback/seek` — seek to an event ID
- `POST /api/playback/start`, `POST /api/playback/reset` — start / reset playback (orchestrator-driven auto-advance)
- `POST /api/show/live`, `DELETE /api/show/live` — enable / disable live mode
- `PATCH /api/show/automation` — set `autoResolveEnabled`, `autoResolveSpeedMs`, `fullAutoEnabled`
- `PATCH /api/show/settings` — set `tickRate` (must be one of `AllowedTickRates`: 120, 120/1.001, 100, 60, 60/1.001, 50, 30, 30/1.001, 25, 24, 24/1.001)
- `GET /` — health check

OpenAPI and docs: `GET /openapi` (JSON), dumped `openapi.yaml` on build, Scalar UI at `/scalar`.

## Realtime and clock sync

The server is authoritative for playback. It persists the cursor before
broadcasting. Clients do not advance the timeline independently. Persistence
is via Bun ORM on `show_states` with `MutateShow(version, fn)` compare-and-swap.

Protobuf is the single source of truth for WS messages (`apps/server/proto/show/v1/show.proto`).
The server broadcasts binary `Envelope` frames over `coder/websocket` at `/hubs/show`;
the client decodes them with `@bufbuild/protobuf` in `packages/realtime/src/ws-client.ts` and
`apps/web/src/lib/realtime.worker.ts`.

Envelope variants (all carry `show_version`):

- `TimelineEventAdded`, `TimelineEventUpdated`, `TimelineEventRemoved`, `TimelineReordered`
- `ShowReplaced`, `PlaybackStateChanged` (includes `server_time_unix_ms`), `LiveModeChanged`
- `ClockSyncRequest` / `ClockSyncResponse` (client ↔ server round-trip, not broadcast)

### Clock synchronization

Inspired by NTP/SMPTE-timecode principles, adapted for venue networks that
cannot reliably carry SMPTE 2110. Timing is anchored to the server clock:

1. Client sends a binary `ClockSyncRequest` (`client_time_unix_ms`) over the same WS.
2. Server replies with `ClockSyncResponse` (`client_time_unix_ms`, `received_at_unix_ms`, `transmitted_at_unix_ms`) using `Clock.Now()`.
3. Worker collects 5 request/response samples (`CLOCK_SYNC_SAMPLES`), computing RTT and offset per sample (`server-clock.ts` / `clock.ts`).
4. The worker selects the most robust estimate (`selectRobustEstimate`, median-like filtering) and anchors it to `performance.now()` for drift-resistant projection.
5. Resync every 5 seconds (`Schedule.fixed("5 seconds")` in `realtime.worker.ts`) and after reconnect.

Control clients must complete clock sync before issuing playback commands.
Audience clients hold their last confirmed state while disconnected.

### Playback

- Supports forward seek, backward seek, and jump to any event ID.
- Server atomically replaces cursor, cancels prior schedule via `Orchestrator`, and broadcasts durable state.
- Clients cancel local schedules and render the target state; they do not replay skipped transient effects (e.g. SFX).
- `Clock` uses `time.Ticker` at the current tick rate plus a `container/heap` priority queue for scheduled ops. `ScheduleIn` / `Cancel` manage orchestrator tickets; `ProcessDue` drains due ops with panic recovery so one action never kills the tick loop.
- `Orchestrator.ScheduleAdvance` / `CancelAdvance` drive auto-advance; `PlaybackStateChanged` carries snapshot version, playback state, and server execution time. Clients ignore duplicate/older messages.
- A timeline version gap triggers a full snapshot resync.

Client connection lifecycle:
`Idle → Connecting → Connected → Reconnecting → Disconnected → Failed`

### Authenticated transport

HTTP carries `Authorization: Bearer <device-token>` (public: `GET /` health,
`POST /auth/join`, `GET /openapi`, Scalar docs). `GET /assets/*` also accepts
`?token=` because `img`/media tags and downloads cannot set headers; the
frontend builds those URLs with a shared helper. The hub takes
`/hubs/show?token=` and rejects missing/expired tokens before upgrade; revoked
devices are kicked with close code `4401`, which the worker surfaces as an
auth-expired event instead of reconnecting. Never-lockout rules: network
blips and 5xx reconnect with the same token and never show the Join screen;
only `401`/`4401` (expired or revoked) does. Join-code rotation is hitless for
existing sockets. SQLite runs a single writer with a 5s busy timeout
(`show.Open`), so concurrent joins and heartbeat writes never surface
`SQLITE_BUSY`. Logs use per-domain zerologgers (`component` field: `auth`,
`hub`); serve mode defaults to info+. Plain HTTP on shared venue WiFi is passively sniffable —
short 30h TTLs, code≠token separation, and kick/rotate shrink the window, but
TLS termination at the venue router is the real fix (out of scope).

SFX is best-effort: each receiving client plays it on event delivery. Exact
cross-client audio synchronization and replay of missed audio are out of scope.

## Invariants

- A persisted snapshot version is monotonically increasing.
- A client only mutates from a current snapshot.
- The server serializes playback transitions.
- Reconnection always converges through an authoritative snapshot.
- The same XML input and exclusions produce the same generated timeline.
