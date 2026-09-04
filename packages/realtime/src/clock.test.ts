import { describe, expect, test } from "vitest";

import {
  calculateClockSample,
  createDriftState,
  projectServerNow,
  selectClockEstimate,
  selectRobustEstimate,
  updateDrift,
} from "./clock";

describe("calculateClockSample", () => {
  test("estimates the server time without using the client wall clock", () => {
    const sample = calculateClockSample(
      {
        sessionId: "session-1",
        clientSentAtUnixMs: 1_784_356_800_000,
        serverReceivedAtUnixMs: 1_784_356_810_040,
        serverTransmittedAtUnixMs: 1_784_356_810_060,
      },
      1_000,
      1_100,
    );

    expect(sample.roundTripMs).toBe(80);
    expect(sample.clientReceivedAtMonotonicMs).toBe(1_100);
    expect(sample.serverNowMs).toBe(1_784_356_810_100);
  });

  test("selects the sample with the lowest network delay", () => {
    const selected = selectClockEstimate(
      [
        { clientReceivedAtMonotonicMs: 10, roundTripMs: 40, serverNowMs: 10 },
        { clientReceivedAtMonotonicMs: 20, roundTripMs: 10, serverNowMs: 20 },
      ],
      100,
    );

    expect(selected).toMatchObject({
      clientReceivedAtMonotonicMs: 20,
      roundTripMs: 10,
      serverNowMs: 20,
      sampledAtMs: 100,
    });
  });

  test("projects from the selected sample instead of the end of a sample burst", () => {
    expect(projectServerNow(1_000, 100, 1_100)).toBe(2_000);
  });
});

describe("selectRobustEstimate", () => {
  test("averages the best samples within RTT limit", () => {
    const estimate = selectRobustEstimate(
      [
        { clientReceivedAtMonotonicMs: 100, roundTripMs: 5, serverNowMs: 10_000 },
        { clientReceivedAtMonotonicMs: 200, roundTripMs: 10, serverNowMs: 10_010 },
        { clientReceivedAtMonotonicMs: 300, roundTripMs: 100, serverNowMs: 10_100 },
        { clientReceivedAtMonotonicMs: 400, roundTripMs: 300, serverNowMs: 10_300 },
      ],
      500,
      3,
      200,
    );

    expect(estimate).toBeDefined();
    // Average of top 3 (5ms, 10ms, 100ms) = (10000 + 10010 + 10100) / 3 ≈ 10037
    expect(estimate?.serverNowMs).toBe(10_037);
    expect(estimate?.roundTripMs).toBe(5);
  });

  test("returns undefined when all samples exceed maxRttMs", () => {
    const estimate = selectRobustEstimate(
      [{ clientReceivedAtMonotonicMs: 100, roundTripMs: 300, serverNowMs: 10_000 }],
      500,
      3,
      200,
    );

    expect(estimate).toBeUndefined();
  });

  test("returns undefined for empty samples", () => {
    expect(selectRobustEstimate([], 500)).toBeUndefined();
  });
});

describe("drift tracking", () => {
  test("starts with rate 1.0", () => {
    const d = createDriftState();
    expect(d.rate).toBe(1);
    expect(d.lastServerNowMs).toBe(0);
    expect(d.lastMonotonicMs).toBe(0);
  });

  test("first update sets anchors without changing rate", () => {
    const d = createDriftState();
    const updated = updateDrift(d, 1_000_000, 50_000);
    expect(updated.rate).toBe(1);
    expect(updated.lastServerNowMs).toBe(1_000_000);
    expect(updated.lastMonotonicMs).toBe(50_000);
  });

  test("second update smooths observed drift", () => {
    const d = createDriftState();
    const afterFirst = updateDrift(d, 1_000_000, 50_000);
    // 10.2 s wall-clock elapsed, 10 s monotonic elapsed → observed = 1.02
    const afterSecond = updateDrift(afterFirst, 1_010_200, 60_000);
    // observed = 1.02 → smoothed = 1 + 0.15*(1.02 - 1) = 1.003
    expect(afterSecond.rate).toBeCloseTo(1.003, 3);
  });
});

describe("updateDrift guardrails", () => {
  test("short-interval sample does not change the rate", () => {
    const d = { rate: 1.0, lastServerNowMs: 1_000_000, lastMonotonicMs: 50_000 };
    const result = updateDrift(d, d.lastServerNowMs + 5, d.lastMonotonicMs + 50);
    expect(result.rate).toBe(1.0);
    expect(result.lastServerNowMs).toBe(1_000_005);
    expect(result.lastMonotonicMs).toBe(50_050);
  });

  test("absurd observed ratio is rejected", () => {
    const d = { rate: 1.0, lastServerNowMs: 1_000_000, lastMonotonicMs: 50_000 };
    const result = updateDrift(d, d.lastServerNowMs + 100_000, d.lastMonotonicMs + 1_000);
    expect(result.rate).toBe(1.0);
  });

  test("observed 1.0 keeps rate at 1.0", () => {
    const d = { rate: 1.0, lastServerNowMs: 1_000_000, lastMonotonicMs: 50_000 };
    const result = updateDrift(d, d.lastServerNowMs + 2_000, d.lastMonotonicMs + 2_000);
    expect(result.rate).toBe(1.0);
  });

  test("observed just over 1.05 is rejected", () => {
    const d = { rate: 1.0, lastServerNowMs: 1_000_000, lastMonotonicMs: 50_000 };
    const result = updateDrift(d, d.lastServerNowMs + 1_100, d.lastMonotonicMs + 1_000);
    expect(result.rate).toBe(1.0);
  });

  test("valid observed 1.01 moves rate slightly toward 1.01", () => {
    const d = { rate: 1.0, lastServerNowMs: 1_000_000, lastMonotonicMs: 50_000 };
    const result = updateDrift(d, d.lastServerNowMs + 1_010, d.lastMonotonicMs + 1_000);
    expect(Math.abs(result.rate - 1.0)).toBeLessThan(0.05);
    expect(result.rate).toBeGreaterThanOrEqual(0.98);
    expect(result.rate).toBeLessThanOrEqual(1.02);
  });

  test("clamp keeps rate within band over repeated valid samples", () => {
    let d = { rate: 1.0, lastServerNowMs: 1_000_000, lastMonotonicMs: 50_000 };
    for (let i = 0; i < 20; i++) {
      d = updateDrift(d, d.lastServerNowMs + 2_000, d.lastMonotonicMs + 2_000);
      expect(d.rate).toBeGreaterThanOrEqual(0.98);
      expect(d.rate).toBeLessThanOrEqual(1.02);
    }
    expect(d.rate).toBe(1.0);
  });
});

describe("projectServerNow with drift", () => {
  test("drift rate < 1 slows the projection", () => {
    expect(projectServerNow(1_000, 100, 200, 0.5)).toBe(1_050);
  });

  test("drift rate > 1 accelerates the projection", () => {
    expect(projectServerNow(1_000, 100, 200, 1.5)).toBe(1_150);
  });

  test("default drift rate of 1 maintains current behavior", () => {
    expect(projectServerNow(1_000, 100, 200)).toBe(1_100);
  });
});
