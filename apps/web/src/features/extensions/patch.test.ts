import { QueryClient } from "@tanstack/react-query";
import { patchNonResolveEvent } from "@tgb-resolver/contracts";
import { type TimelineEvent, TimelineEventType } from "@tgb-resolver/realtime";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { playbackModel } from "@/features/control/playback-model";
import { showModel } from "@/features/shared/show-model";

import { ExtensionPayloadValidationError, patchExtensionPayload } from "./patch";

vi.mock("@tgb-resolver/contracts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tgb-resolver/contracts")>()),
  patchNonResolveEvent: vi.fn(),
}));

const timerEvent: TimelineEvent = {
  id: 7,
  position: 1,
  type: TimelineEventType.CUS,
  payload: { extId: "timer", extPayload: { durationSeconds: 10, autoHide: true } },
};

const queryClient = new QueryClient();

beforeEach(() => {
  showModel.showEvents.value = { [timerEvent.id]: timerEvent };
  playbackModel.state.value = { ...playbackModel.state.value, showVersion: 3 };
  vi.mocked(patchNonResolveEvent).mockClear();
  vi.mocked(patchNonResolveEvent).mockResolvedValue({ data: undefined } as never);
});

describe("patchExtensionPayload", () => {
  test("merges patch onto current payload and PATCHes with current showVersion", async () => {
    await patchExtensionPayload(queryClient, timerEvent.id, "timer", { durationSeconds: 30 });

    expect(patchNonResolveEvent).toHaveBeenCalledTimes(1);
    const body = vi.mocked(patchNonResolveEvent).mock.calls[0][0].body;
    expect(body.showVersion).toBe(3);
    expect(body.custom).toEqual({
      extId: "timer",
      extPayload: { durationSeconds: 30, autoHide: true },
    });
  });

  test("throws ValidationError and never PATCHes on invalid payload", async () => {
    await expect(
      patchExtensionPayload(queryClient, timerEvent.id, "timer", { durationSeconds: "oops" }),
    ).rejects.toBeInstanceOf(ExtensionPayloadValidationError);

    expect(patchNonResolveEvent).not.toHaveBeenCalled();
  });

  test("throws on unknown extension", async () => {
    await expect(patchExtensionPayload(queryClient, timerEvent.id, "nope", {})).rejects.toThrow(
      "Unknown extension",
    );

    expect(patchNonResolveEvent).not.toHaveBeenCalled();
  });

  test("partial patch on a fresh event without extPayload is completed from config-form defaults", async () => {
    showModel.showEvents.value = {
      [timerEvent.id]: { ...timerEvent, payload: { extId: "timer" } },
    };

    await patchExtensionPayload(queryClient, timerEvent.id, "timer", { durationSeconds: 30 });

    const body = vi.mocked(patchNonResolveEvent).mock.calls[0][0].body;
    expect(body.custom).toEqual({
      extId: "timer",
      extPayload: { durationSeconds: 30, autoHide: true },
    });
  });

  test("extPayload keys not declared in the config form are dropped on save", async () => {
    showModel.showEvents.value = {
      [timerEvent.id]: {
        ...timerEvent,
        payload: { extId: "timer", extPayload: { durationSeconds: 10, autoHide: true, stale: 1 } },
      },
    };

    await patchExtensionPayload(queryClient, timerEvent.id, "timer", { durationSeconds: 30 });

    const body = vi.mocked(patchNonResolveEvent).mock.calls[0][0].body;
    expect(body.custom).toEqual({
      extId: "timer",
      extPayload: { durationSeconds: 30, autoHide: true },
    });
  });

  test("throws when the event is not a matching CUS event", async () => {
    await expect(
      patchExtensionPayload(queryClient, 999, "timer", { durationSeconds: 5 }),
    ).rejects.toThrow("not a timer custom event");

    expect(patchNonResolveEvent).not.toHaveBeenCalled();
  });
});
