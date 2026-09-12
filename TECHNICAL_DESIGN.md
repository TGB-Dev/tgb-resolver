# TGB Resolver technical design

- See [AGENTS.md](./AGENTS.md) for commands, conventions, tooling
- See [apps/web/QUICK_REF.md](./apps/web/QUICK_REF.md) for frontend detail

## Purpose

- Import ICPC/DMOJ contest feeds
- Produce an editable event timeline
- Drive audience + control UIs from one authoritative server state
- Server owns:
  - Persistence
  - Contest conversion
  - Playback state
  - Versioning
  - Realtime broadcasts
- Clients:
  - Render state
  - Submit versioned commands

## Motivation

- VNOI Resolver:
  - PixiJS + React
  - Single window
  - Keybinding toggles control/audience
- ICPC Resolver:
  - JVM-based
  - Hardcoded ICPC rules
  - High RAM usage
- TGB differences:
  - Decoupled UIs by URL route
  - Automatic server-side parsing (no XML preprocessing)
- Custom event system:
  - Every action is a typed cue (resolve, image, SFX)
  - Trigger manually, automatically, or relative to another cue
  - MC-driven shows stay "in the pocket"
  - No fixed NLE-style timeline
- UI inspired by GrandMA3:
  - Relative timeline
  - Main panel shows current + next + prior cues

## System boundaries

- `apps/server/`: Go 1.26+ server
  - HTTP/WebSocket, parsing, tests
  - `features/importing`: ICPC XML parser (`encoding/xml`) + resolver engine
  - `features/show`: show state, timeline, playback, import/export
    - Huma + Gin handlers + Bun store
  - `features/assets`: asset filestore (`.data/assets`) + bundle zip
    - `archive/zip` + `zeebo/xxh3`
  - `features/realtime`:
    - `Clock` (ticker + heap)
    - `Orchestrator`
    - `Hub` (coder/websocket + Protobuf `Envelope`)
  - `features/shared/config`: Viper config
    - `PORT`, `ALLOWED_ORIGINS`, `DATA_DIR`
  - `proto/show/v1/show.proto`: single source of truth for WS messages
- `apps/web/`: canonical Vue 3 SPA (`@tgb-resolver/web`)
  - Audience + control UIs
- `packages/contracts/`:
  - OpenAPI-generated TS HTTP client
  - TanStack Query helpers
  - Valibot schemas
- `packages/realtime/`:
  - Protobuf-generated types
  - `ws-client.ts`
  - Clock sync helpers
  - Timeline + domain helpers

### Client-side architecture

- `src/features/` holds feature-sliced modules
- `control/`:
  - Playback store
  - Timeline cursor
  - Multi-panel floating panel store + types (handle-based)
  - All control-domain state
- `leaderboard/`:
  - Leaderboard state store
- `assets-manager/`:
  - Folder/file browser store (feature-local)
- `shared/`:
  - Show state
  - Realtime connection
  - Confirm dialogs
  - Fullscreen toggle
- `extensions/`:
  - Base types
  - Static registry (`extensionRegistry`)
  - Config UI
  - `patchExtensionPayload` server-patch API
- State model:
  - Pinia setup stores
  - Vue `ref` / `computed` reactivity
  - Shared state imported from Pinia stores
  - Example: `@/features/control/playback-store`, `@/stores/show-store`

## Engineering conventions

- String-valued enums for finite vocabularies
  - In TypeScript and Go
  - No handwritten string unions
  - No unions for modes, status, event types, asset kinds
- Generated OpenAPI contracts own REST/shared wire enums
- `packages/realtime` re-exports those enums
  - Must not redeclare them
- See [AGENTS.md](./AGENTS.md) for full conventions, tooling, Go specifics

### Tech choices

- Turborepo:
  - Pruned builds + caching across pnpm workspace
- Pinia + Vue reactivity:
  - Fine-grained updates
  - Feature-owned setup stores
  - Computed derivations
- Panda CSS + Chakra preset:
  - Generated recipes + slot recipes
  - Atomic classes + conditional styles
- Ark UI Vue:
  - Accessible headless behavior
  - Always bound to matching Panda slot recipe
- Protobuf + coder/websocket:
  - Smaller wire payload than JSON
  - Binary `Envelope` frames on `/hubs/show`
- Huma v2 + Gin:
  - Typed handlers + OpenAPI generation
  - Gin router
  - Scalar docs at `/scalar`
  - Spec at `/openapi`
- Bun ORM + modernc.org/sqlite:
  - Pure-Go SQLite, no CGO
  - Single `show_states` row
  - Trivial Docker/Turbo usage
- Wire (`github.com/goforj/wire`):
  - Compile-time DI
  - Provider sets per feature (`wire.go` → `wire_gen.go`)
- Feature-based server structure:
  - Domain-organized handlers, dtos, services per feature

### Frontend rendering performance

- `usePlaybackStore().state` is the single `ref` for playback
- Derived `computed`s:
  - `currentEventId`
  - `currentCueId`
  - `status`
- `currentCueId` equals `currentEventId`
  - `currentResolveEventId` rule removed (fixed double-highlight bug)
- Timeline highlight reads `currentCueId`
- Scroll target reads `currentCueId`
- Cue tab reads `currentCueId`
- `state.value` subscribes to the whole object
  - Dominant re-render source
- Conventions:
  - Keep hot-state reads in small leaf components
  - Do not re-render timeline rows, transport, cue tab on ticks
  - Drive hot-path animation with `motion-v` / vanilla `motion` + imperative WAAPI `animate()`
  - No declarative props bound to fast-changing state
  - Use Vue `computed` for derived values
  - Batch correlated writes
  - Keep store mutations granular

### Tooling

- See [AGENTS.md](./AGENTS.md) for:
  - Turborepo, Biome, syncpack, openapi-ts, buf, tsdown, knip, Wire
  - Pre-commit flow
  - `verbatimModuleSyntax`, `gofmt`, `go vet`

### Go tests

- Standard `testing` package
- Run:
  ```sh
  pnpm --filter @tgb-resolver/server test
  ```
  - Internally runs `go test ./...`
- Tests owned per feature:
  - `features/importing/*_test.go`
  - `features/show/*_test.go`
  - `features/realtime/*_test.go`
  - `features/shared/domain/*_test.go`

## Timeline

- Ordered list of typed events
- `Res` (`RES`):
  - Reveal one team/problem resolution
  - Includes resulting score/rank
- `Pre` (`PRE`):
  - Pre-resolve cue before each `Res`
  - Lets frontend focus the upcoming resolution
- `Cus` (`CUS`):
  - Custom user-defined event
  - Freeform payload (`extId` + `extPayload`)
- Resolve events:
  - Generated by import
  - IDs immutable
  - Order immutable
  - Resolve payloads immutable
  - Cannot delete
  - Cannot reorder
  - Presentation metadata editable
- Custom (`Cus`) events:
  - Full CRUD
  - Including ordering
- Two orthogonal modes:
  - `ShowMode`: `Editing` (default) vs `Live`
    - Controls live broadcast
  - `TimelineMode`: `Rw` (default, read-write) vs `Ro` (read-only)
    - `Ro` prevents editing
  - Never represent either as Boolean

## XML conversion

- Accepts XML + optional excluded usernames
- Excluded teams removed before ranking/timeline
- Excluded runs removed before ranking/timeline
- DMOJ/VNOI XML is score-based
- Resolver preserves that model
- Steps:
  1. Before freeze: keep each team's max score per problem
  2. Rank by total score, then VNOI finish-time penalty, then team ID
  3. Shared rank for equal score/penalty
  4. Record result as contest snapshot
  5. Per changed team/problem: keep final score-altering run as pending reveal
  6. Simulate reveals from current bottom pending team
  7. Pick its leftmost pending problem by contest order
  8. Emit `Pre` + `Res` per pending reveal
  9. Include zero-score failures
  10. `Pre` lets frontend pre-focus the upcoming resolution
- Deterministic conversion
- No ICPC Resolver optimizer
- No intentional reorder for dramatic effect

## HTTP API

- All mutations versioned
- Caller sends observed `showVersion`
- Server rejects stale versions with `409 Conflict` (`ErrVersionDrift`)
- Rejected client fetches latest snapshot
- Rejected client never merges locally

- Import / export:
  - `POST /import/xml`: import ICPC/DMOJ XML (`{ xml, excludedUsernames }`)
  - `POST /import/bundle`: import zipped bundle (base64 `bytes`, 1 GB limit, 10 min timeout)
  - `POST /import/xml/users`: preview users without importing
  - `GET /export/bundle`: export bundle as `[]byte` (zip + xxh3)

- Show and timeline:
  - `GET /timeline`: current `ShowState` snapshot
  - `POST /api/show/optimize`: deduplicate show
  - `POST /api/show/clear`: clear show
  - `PATCH /api/show/events/resolve/{id}`: rename resolve event (`customName`)
  - `PATCH /api/show/events/non-resolve/{id}`: patch custom event
    - `triggerOffsetSeconds`, `requireManualInteraction`, `customName`, `custom`
  - `POST /timeline/event`: create custom event (relative to another, `before` flag)
  - `PATCH /timeline/event/{id}`: patch custom event
  - `PATCH /timeline/event/{id}/position`: move custom event
  - `DELETE /timeline/event/{id}`: delete custom event
  - `PATCH /timeline/mode`: set `timelineMode` (`Rw` / `Ro`)
  - `GET /assets/:id`: fetch asset
  - `POST /assets/:id`: upload asset (multipart via `assets/handlers.go`)
  - `DELETE /assets/entries/{id}`: delete folder or file
  - `PATCH /assets/entries/{id}`: rename folder or file
  - `POST /assets/folders`: create folder
  - `PATCH /assets/{assetId}/move`: move asset

- Auth (shared join code → per-device tokens, BLAKE3-hashed at rest):
  - `POST /auth/join`: exchange code for device token + `foo-bar` label (rate-limited)
  - `GET /auth/join-code`: current code (Bearer, or loopback without token for first setup)
  - `POST /auth/rotate`: new join code, sessions survive
  - `GET /auth/sessions`: device list (label, last seen, expiry)
  - `DELETE /auth/sessions/{id}`: revoke one device (kicks socket with WS close 4401)
  - `/hubs/auth`: presence hub (token-gated protobuf socket, `proto/auth/v1`)
    - Binary `AuthUpdate` frames (`sessions-changed`, `join-code-changed`)
    - Open Auth tabs refresh live
    - Sessions carry `online` flag (socket-connected = now, + 10s grace on last seen)

- Playback and show control:
  - `POST /playback/seek`: seek to event ID
  - `POST /api/playback/start`: start playback (orchestrator auto-advance)
  - `POST /api/playback/reset`: reset playback
  - `POST /api/show/live`: enable live mode
  - `DELETE /api/show/live`: disable live mode
  - `PATCH /api/show/automation`: set `autoResolveEnabled`, `autoResolveSpeedMs`, `fullAutoEnabled`
  - `PATCH /api/show/settings`: set `tickRate`
    - Must be in `AllowedTickRates`: 120, 120/1.001, 100, 60, 60/1.001, 50, 30, 30/1.001, 25, 24, 24/1.001
  - `GET /`: health check

- OpenAPI and docs:
  - `GET /openapi`: JSON spec
  - `openapi.yaml`: dumped on build
  - Scalar UI at `/scalar`

## Realtime and clock sync

- Server is authoritative for playback
- Persists cursor before broadcasting
- Clients do not advance timeline independently
- Persistence via Bun ORM on `show_states`
- `MutateShow(version, fn)` compare-and-swap
- Protobuf is single source of truth (`apps/server/proto/show/v1/show.proto`)
- Server broadcasts binary `Envelope` over coder/websocket at `/hubs/show`
- Client decodes with `@bufbuild/protobuf`
  - In `packages/realtime/src/ws-client.ts`
  - In `apps/web/src/lib/realtime.worker.ts`

- Envelope variants (all carry `show_version`):
  - `TimelineEventAdded`
  - `TimelineEventUpdated`
  - `TimelineEventRemoved`
  - `TimelineReordered`
  - `ShowReplaced`
  - `PlaybackStateChanged` (includes `server_time_unix_ms`)
  - `LiveModeChanged`
  - `ClockSyncRequest` / `ClockSyncResponse` (round-trip, not broadcast)

### Clock synchronization

- Inspired by NTP/SMPTE-timecode
- Adapted for venue networks without reliable SMPTE 2110
- Anchored to server clock
- Steps:
  1. Client sends binary `ClockSyncRequest` (`client_time_unix_ms`) over same WS
  2. Server replies `ClockSyncResponse` (`client_time_unix_ms`, `received_at_unix_ms`, `transmitted_at_unix_ms`) via `Clock.Now()`
  3. Worker collects 5 samples (`CLOCK_SYNC_SAMPLES`)
  4. Computes RTT + offset per sample (`server-clock.ts` / `clock.ts`)
  5. Selects robust estimate (`selectRobustEstimate`, median-like filtering)
  6. Anchors to `performance.now()` for drift-resistant projection
  7. Resyncs every 5s (`Schedule.fixed("5 seconds")` in `realtime.worker.ts`)
  8. Resyncs after reconnect
- Control clients must complete clock sync before playback commands
- Audience clients hold last confirmed state while disconnected

### Playback

- Supports:
  - Forward seek
  - Backward seek
  - Jump to any event ID
- Server:
  - Atomically replaces cursor
  - Cancels prior schedule via `Orchestrator`
  - Broadcasts durable state
- Clients:
  - Cancel local schedules
  - Render target state
  - Do not replay skipped transient effects (e.g. SFX)
- `Clock`:
  - `time.Ticker` at current tick rate
  - `container/heap` priority queue for scheduled ops
  - `ScheduleIn` / `Cancel` manage orchestrator tickets
  - `ProcessDue` drains due ops with panic recovery (one action never kills tick loop)
- `Orchestrator.ScheduleAdvance` / `CancelAdvance` drive auto-advance
- `PlaybackStateChanged` carries snapshot version + playback state + server execution time
- Clients ignore duplicate/older messages
- Timeline version gap triggers full snapshot resync

- Connection lifecycle:
  - `Idle` → `Connecting` → `Connected` → `Reconnecting` → `Disconnected` → `Failed`

### Authenticated transport

- HTTP carries `Authorization: Bearer <device-token>`
- Public routes (no token):
  - `GET /` health
  - `POST /auth/join`
  - `GET /openapi`
  - Scalar docs
- `GET /assets/*` also accepts `?token=`
  - `img`/media tags and downloads cannot set headers
  - Frontend builds those URLs with a shared helper
- Hub takes `/hubs/show?token=`
  - Rejects missing/expired tokens before upgrade
  - Revoked devices kicked with close `4401`
  - Worker surfaces `4401` as auth-expired (no reconnect)
- Never-lockout rules:
  - Network blips + 5xx reconnect with same token
  - Never show Join screen on blips/5xx
  - Only `401`/`4401` (expired/revoked) shows Join screen
- Join-code rotation is hitless for existing sockets
- SQLite single writer + 5s busy timeout (`show.Open`)
  - Concurrent joins + heartbeats never surface `SQLITE_BUSY`
- Logs use per-domain zerologgers (`component`: `auth`, `hub`)
- Serve mode defaults to info+
- Plain HTTP on shared venue WiFi is sniffable
  - Short 30h TTLs shrink the window
  - Code≠token separation shrinks the window
  - Kick/rotate shrink the window
  - Real fix is TLS at venue router (out of scope)

- SFX is best-effort:
  - Each client plays on event delivery
  - No exact cross-client audio sync
  - No replay of missed audio

## Invariants

- Snapshot version monotonically increasing
- Client only mutates from a current snapshot
- Server serializes playback transitions
- Reconnection always converges via authoritative snapshot
- Same XML input + exclusions produce same timeline
