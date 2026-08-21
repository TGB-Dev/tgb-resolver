import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("server-clock", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("anchors the projection on the main-thread monotonic clock, not the worker's", async () => {
    let mainNow = 600_000;
    vi.spyOn(performance, "now").mockImplementation(() => mainNow);

    const { getServerNow, updateServerClock } = await import("./server-clock");

    // The worker realm reports monotonic 42ms (its time origin starts at worker
    // creation, not navigation) while estimating server wall clock 1_000_000.
    updateServerClock(1_000_000, 42);

    mainNow += 1_000;
    expect(getServerNow()).toBe(1_001_000);
  });

  test("a resync whose reported worker-monotonic restarts does not shift the clock", async () => {
    let mainNow = 100_000;
    vi.spyOn(performance, "now").mockImplementation(() => mainNow);

    const { getServerNow, updateServerClock } = await import("./server-clock");

    updateServerClock(1_000_000, 10);
    mainNow += 5_000;
    const before = getServerNow();

    // Worker recreated: its monotonic timeline restarted near zero even though
    // the server wall clock advanced by the full 5 seconds.
    updateServerClock(1_005_000, 7);

    expect(Math.abs(getServerNow() - before)).toBeLessThanOrEqual(50);
  });
});
