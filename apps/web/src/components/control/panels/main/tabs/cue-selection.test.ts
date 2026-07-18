import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { describe, expect, test } from "vitest";

import { currentCue } from "./cue-selection";

function row(id: number, type: TimelineEventType): TimelineTableItem {
  return {
    id,
    type,
    name: `e${id}`,
    customName: undefined,
    placeholderName: `e${id}`,
    triggerOffsetSeconds: 0,
    requireManualInteraction: false,
    durationSeconds: undefined,
  } as TimelineTableItem;
}

describe("currentCue", () => {
  const rows = [
    row(1, TimelineEventType.RES),
    row(2, TimelineEventType.IMG),
    row(3, TimelineEventType.RES),
  ];

  test("returns undefined when no current event", () => {
    expect(currentCue(rows, null, null)).toBeUndefined();
  });

  test("selects the current event by id", () => {
    expect(currentCue(rows, 2, null)?.id).toBe(2);
  });

  test("prefers RES over IMG among concurrent adjacent events", () => {
    // currentEventId=2 (IMG) with currentResolveEventId=1 (RES, adjacent)
    expect(currentCue(rows, 2, 1)?.id).toBe(1);
  });
});
