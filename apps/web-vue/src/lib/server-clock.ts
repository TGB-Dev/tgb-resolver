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

export function updateServerClock(serverClockMs: number, monotonicMs: number): void {
  drift = updateDrift(drift, serverClockMs, monotonicMs);
  serverClockAtSyncMs = serverClockMs;
  monotonicAtSyncMs = monotonicMs;
}
