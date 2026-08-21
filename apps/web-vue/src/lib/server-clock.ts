import {
  createDriftState,
  type DriftState,
  projectServerNow,
  updateDrift,
} from "@tgb-resolver/realtime";

let serverClockAtSyncMs = Date.now();
let monotonicAtSyncMs = performance.now();
let drift: DriftState = createDriftState();

export function getServerNow(): number {
  return projectServerNow(serverClockAtSyncMs, monotonicAtSyncMs, performance.now(), drift.rate);
}

/**
 * Anchor projection on the **main-thread** monotonic clock.
 *
 * The worker reports its own `performance.now()` origin (starts at worker
 * creation). Projecting with that value against main-thread `performance.now()`
 * makes the clock run wildly fast/slow. Ignore the worker monotonic and use
 * the main-thread clock for both drift estimation and the projection anchor.
 */
export function updateServerClock(serverClockMs: number, _workerMonotonicMs?: number): void {
  const monotonicMs = performance.now();
  drift = updateDrift(drift, serverClockMs, monotonicMs);
  serverClockAtSyncMs = serverClockMs;
  monotonicAtSyncMs = monotonicMs;
}
