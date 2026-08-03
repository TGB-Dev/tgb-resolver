import { type TimelineEventAddedMessage, TimelineEventType } from "@tgb-resolver/realtime";
import { expect, test } from "vitest";

import { mapTimelineEvent } from "./show-message-mapper";

test("preserves a timeline event duration received over SignalR", () => {
  const event = mapTimelineEvent({
    Id: 42,
    Position: 4,
    Type: TimelineEventType.CUS as unknown as TimelineEventAddedMessage["Event"]["Type"],
    DurationSeconds: 7,
    TriggerOffsetSeconds: undefined,
    RequireManualInteraction: false,
    CustomName: undefined,
    Custom: { ExtId: "timer" },
  } satisfies TimelineEventAddedMessage["Event"]);

  expect(event.durationSeconds).toBe(7);
});
