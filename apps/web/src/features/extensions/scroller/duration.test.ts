import { describe, expect, test } from "vitest";

import { computeScrollerExtensionDuration } from "./duration";

describe("computeScrollerExtensionDuration", () => {
  test("is 1 second (top scroll) plus the configured downward duration", () => {
    expect(computeScrollerExtensionDuration({ duration: 10 })).toBe(11);
    expect(computeScrollerExtensionDuration({ duration: 0.5 })).toBe(1.5);
  });

  test("defaults the downward duration to 10 seconds", () => {
    expect(computeScrollerExtensionDuration({})).toBe(11);
  });
});
