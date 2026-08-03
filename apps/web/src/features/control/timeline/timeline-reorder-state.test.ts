import { describe, expect, test } from "vitest";

import { createTimelineReorderState } from "./timeline-reorder-state";

describe("createTimelineReorderState", () => {
  test("keeps drag ordering local until it is consumed", () => {
    const state = createTimelineReorderState();

    state.set([2, 1]);

    expect(state.rows.value).toEqual([2, 1]);
    expect(state.take()).toEqual([2, 1]);
    expect(state.rows.value).toBeNull();
  });
});
