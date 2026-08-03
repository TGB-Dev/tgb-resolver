import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { describe, expect, test } from "vitest";

import { createTimelineReorderState } from "./timeline-reorder-state";

function row(id: number): TimelineTableItem {
  return {
    id,
    position: id,
    type: TimelineEventType.CUS,
    placeholderName: `Event ${id}`,
    name: `Event ${id}`,
    durationSeconds: 0,
    triggerOffsetSeconds: undefined,
    requireManualInteraction: false,
    newTotalScore: 0,
    newRank: 0,
    isActive: false,
  };
}

describe("createTimelineReorderState", () => {
  test("keeps drag ordering local until it is consumed", () => {
    const state = createTimelineReorderState();
    const first = row(1);
    const second = row(2);

    state.set([second, first]);

    expect(state.rows.value).toEqual([second, first]);
    expect(state.take()).toEqual([second, first]);
    expect(state.rows.value).toBeNull();
  });
});
