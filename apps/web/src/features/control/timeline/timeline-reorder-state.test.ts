import { describe, expect, it } from "vitest";

import { createTimelineReorderState } from "./timeline-reorder-state";

describe("timeline reorder state", () => {
  it("stores one pending order and consumes it once", () => {
    const state = createTimelineReorderState();
    expect(state.take()).toBeNull();
    state.set([3, 1, 2]);
    expect(state.take()?.join(",")).toBe("3,1,2");
    expect(state.take()).toBeNull();
  });
});
