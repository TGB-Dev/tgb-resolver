import type { ClockSyncResponse } from "./types";

export interface ClockSample {
  clientReceivedAtMonotonicMs: number;
  roundTripMs: number;
  serverNowMs: number;
}

export interface ClockEstimate extends ClockSample {
  sampledAtMs: number;
}

export interface DriftState {
  rate: number;
  lastServerNowMs: number;
  lastMonotonicMs: number;
}

export function createDriftState(): DriftState {
  return { rate: 1, lastServerNowMs: 0, lastMonotonicMs: 0 };
}

/**
 * Updates the drift rate using an exponential moving average between the
 * observed server-wall-clock elapsed and monotonic-clock elapsed since the
 * last sync. Returns a new `DriftState` with the smoothed rate and the current
 * anchor values.
 */
export function updateDrift(
  drift: DriftState,
  serverNowMs: number,
  monotonicMs: number,
): DriftState {
  if (drift.lastServerNowMs > 0) {
    const serverElapsed = serverNowMs - drift.lastServerNowMs;
    const monotonicElapsed = monotonicMs - drift.lastMonotonicMs;
    if (monotonicElapsed > 0 && serverElapsed > 0) {
      if (monotonicElapsed < 1000) {
        return { rate: drift.rate, lastServerNowMs: serverNowMs, lastMonotonicMs: monotonicMs };
      }
      const observed = serverElapsed / monotonicElapsed;
      if (observed < 0.95 || observed > 1.05) {
        return { rate: drift.rate, lastServerNowMs: serverNowMs, lastMonotonicMs: monotonicMs };
      }
      const rate = drift.rate + 0.15 * (observed - drift.rate);
      const clampedRate = Math.min(1.02, Math.max(0.98, rate));
      return { rate: clampedRate, lastServerNowMs: serverNowMs, lastMonotonicMs: monotonicMs };
    }
  }
  return { rate: drift.rate, lastServerNowMs: serverNowMs, lastMonotonicMs: monotonicMs };
}

export function calculateClockSample(
  response: ClockSyncResponse,
  clientSentAtMonotonicMs: number,
  clientReceivedAtMonotonicMs: number,
): ClockSample {
  const { serverReceivedAtUnixMs, serverTransmittedAtUnixMs } = response;
  const roundTripMs = Math.max(
    0,
    clientReceivedAtMonotonicMs -
      clientSentAtMonotonicMs -
      (serverTransmittedAtUnixMs - serverReceivedAtUnixMs),
  );

  // Estimate the server wall-clock at t3. Client timestamps intentionally use
  // a monotonic clock, so browser/system wall-clock adjustments cannot affect
  // the estimate after a connection has been established.
  return {
    clientReceivedAtMonotonicMs,
    roundTripMs,
    serverNowMs: serverTransmittedAtUnixMs + roundTripMs / 2,
  };
}

/**
 * Picks the lowest-RTT sample. Prefer `selectRobustEstimate` for production
 * use; this is kept for tests.
 */
export function selectClockEstimate(
  samples: ClockSample[],
  sampledAtMs: number,
): ClockEstimate | undefined {
  const selected = samples
    .filter((sample) => sample.roundTripMs >= 0)
    .sort((left, right) => left.roundTripMs - right.roundTripMs)[0];
  return selected ? { ...selected, sampledAtMs } : undefined;
}

/**
 * Selects the best samples (by RTT) and returns the **average** server-now of
 * the `count` fastest samples, discarding any whose RTT exceeds `maxRttMs`.
 * This is more robust than a single sample, which can be skewed by asymmetric
 * network latency.
 */
export function selectRobustEstimate(
  samples: ClockSample[],
  sampledAtMs: number,
  count: number = 3,
  maxRttMs: number = 200,
): ClockEstimate | undefined {
  const valid = samples.filter((s) => s.roundTripMs >= 0 && s.roundTripMs <= maxRttMs);
  if (valid.length === 0) return undefined;

  const sorted = valid.sort((a, b) => a.roundTripMs - b.roundTripMs);
  const count_ = Math.min(count, sorted.length);
  const best = sorted.slice(0, count_);

  const avgServerNowMs = best.reduce((sum, s) => sum + s.serverNowMs, 0) / best.length;
  const avgMonotonicMs =
    best.reduce((sum, s) => sum + s.clientReceivedAtMonotonicMs, 0) / best.length;

  return {
    clientReceivedAtMonotonicMs: Math.round(avgMonotonicMs),
    roundTripMs: sorted[0]?.roundTripMs ?? 0,
    serverNowMs: Math.round(avgServerNowMs),
    sampledAtMs,
  };
}

/**
 * Projects the current server wall-clock time by applying the estimated
 * monotonic-to-wall-clock drift rate.
 *
 * @param serverNowAtAnchorMs server wall-clock at the anchor moment
 * @param anchorMonotonicMs   monotonic clock at the anchor moment
 * @param currentMonotonicMs  current monotonic clock value
 * @param driftRate           observed ratio of wall-clock elapsed to
 *                            monotonic-clock elapsed (default 1.0).
 *                            Values < 1 mean the monotonic clock runs
 *                            faster than wall-clock; > 1 means slower.
 */
export function projectServerNow(
  serverNowAtAnchorMs: number,
  anchorMonotonicMs: number,
  currentMonotonicMs: number,
  driftRate: number = 1,
): number {
  return serverNowAtAnchorMs + (currentMonotonicMs - anchorMonotonicMs) * driftRate;
}
