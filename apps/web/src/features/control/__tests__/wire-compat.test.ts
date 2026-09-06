import { QueryClient } from "@tanstack/vue-query";
import {
  decodeEnvelope,
  envelopeToMessageType,
  ShowMessageType,
  TimelineEventType,
} from "@tgb-resolver/realtime";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, test } from "vitest";

import { usePlaybackStore } from "@/features/control/playback-store";
import { mapTimelineEvent } from "@/lib/show-message-mapper";
import { useShowStore } from "@/stores/show-store";

import { applyControlRealtimeMessage } from "../realtime-handler";

// Captured from a live Go server: PATCH /timeline/event/4 (Cus "cap-*",
// extId timer) → TimelineEventUpdated broadcast, showVersion 8.
const CAPTURED_UPDATED_HEX =
  "0a1454696d656c696e654576656e74557064617465645a3808081234080410041a034375733a116361702d3137383836363136343234323552160a0574696d6572120d7b226d696e75746573223a357d";

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer as ArrayBuffer;
}

describe("wire compat with Go server broadcasts", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  test("captured TimelineEventUpdated decodes and applies to the store", async () => {
    const showStore = useShowStore();
    const playbackStore = usePlaybackStore();
    showStore.hydrateFromSnapshot({
      showVersion: 7,
      mode: "Editing",
      timelineMode: "Rw",
      meta: { title: "t", source: "Manual" },
      contest: {
        durationSeconds: 0,
        freezeDurationSeconds: 0,
        problems: [],
        users: [],
        preFreezeSnapshot: [],
      },
      automation: { autoResolveEnabled: false, autoResolveSpeedMs: 3000, fullAutoEnabled: false },
      playback: { status: "Idle", activeEventIds: [] },
      assets: { items: [], folders: [] },
      timeline: [],
    } as never);

    const envelope = decodeEnvelope(hexToBuffer(CAPTURED_UPDATED_HEX));
    expect(envelopeToMessageType(envelope.type)).toBe(ShowMessageType.TimelineEventUpdated);
    expect(envelope.payload.case).toBe("timelineEventUpdated");
    if (envelope.payload.case !== "timelineEventUpdated") return;

    const wire = envelope.payload.value;
    expect(wire.showVersion).toBe(8);
    const event = mapTimelineEvent({
      id: wire.event?.id ?? 0,
      position: wire.event?.position ?? 0,
      type: wire.event?.type ?? "",
      durationSeconds: wire.event?.durationSeconds,
      triggerOffsetSeconds: wire.event?.triggerOffsetSeconds,
      requireManualInteraction: wire.event?.requireManualInteraction,
      customName: wire.event?.customName,
      custom: wire.event?.custom
        ? {
            extId: wire.event.custom.extId,
            extPayload: wire.event.custom.extPayloadJson.length
              ? (JSON.parse(new TextDecoder().decode(wire.event.custom.extPayloadJson)) as Record<
                  string,
                  unknown
                >)
              : undefined,
          }
        : undefined,
    });
    expect(event.type).toBe(TimelineEventType.CUS);
    expect(event.id).toBe(4);

    await applyControlRealtimeMessage(new QueryClient(), {
      type: ShowMessageType.TimelineEventUpdated,
      showVersion: wire.showVersion,
      event,
    });

    expect(showStore.dataVersion).toBe(8);
    expect(4 in showStore.showEvents).toBe(true);
    expect(playbackStore.state.showVersion).toBe(8);
  });
});
