import { describe, expect, test } from "vitest";

import { splitPatchTimelineEventPayload } from "../use-show";

describe("splitPatchTimelineEventPayload", () => {
  test("keeps eventId in path only, never in body", () => {
    const { path, body } = splitPatchTimelineEventPayload({
      eventId: 253,
      triggerOffsetSeconds: 14,
    });

    expect(path).toEqual({ id: 253 });
    expect(body).toEqual({ triggerOffsetSeconds: 14 });
    expect(body).not.toHaveProperty("eventId");
  });

  test("passes all patch fields through", () => {
    const { path, body } = splitPatchTimelineEventPayload({
      eventId: 1,
      durationSeconds: 11,
      useDefaultDuration: false,
      triggerOffsetSeconds: 14,
      clearTriggerOffset: false,
      requireManualInteraction: true,
    });

    expect(path).toEqual({ id: 1 });
    expect(body).toEqual({
      durationSeconds: 11,
      useDefaultDuration: false,
      triggerOffsetSeconds: 14,
      clearTriggerOffset: false,
      requireManualInteraction: true,
    });
  });
});
