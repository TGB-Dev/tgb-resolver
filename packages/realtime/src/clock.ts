import type { ClockSyncResponse } from "./types";

export interface ClockSample {
  clientReceivedAtMonotonicMs: number;
  roundTripMs: number;
  serverNowMs: number;
}

export interface ClockEstimate extends ClockSample {
  sampledAtMs: number;
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

export function selectClockEstimate(
  samples: ClockSample[],
  sampledAtMs: number,
): ClockEstimate | undefined {
  const selected = samples
    .filter((sample) => sample.roundTripMs >= 0)
    .sort((left, right) => left.roundTripMs - right.roundTripMs)[0];
  return selected ? { ...selected, sampledAtMs } : undefined;
}

export function projectServerNow(
  serverNowAtAnchorMs: number,
  anchorMonotonicMs: number,
  currentMonotonicMs: number,
): number {
  return serverNowAtAnchorMs + (currentMonotonicMs - anchorMonotonicMs);
}
