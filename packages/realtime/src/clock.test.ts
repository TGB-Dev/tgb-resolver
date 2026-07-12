import { describe, expect, test } from "vitest";

import { calculateClockSample, projectServerNow, selectClockEstimate } from "./clock";

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
