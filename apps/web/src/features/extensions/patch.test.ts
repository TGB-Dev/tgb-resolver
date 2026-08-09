import { QueryClient } from "@tanstack/react-query";
import { patchTimelineEvent } from "@tgb-resolver/contracts";
import { type TimelineEvent, TimelineEventType } from "@tgb-resolver/realtime";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { playbackModel } from "@/features/control/playback-model";
import { showModel } from "@/features/shared/show-model";

import { ExtensionPayloadValidationError, patchExtensionPayload } from "./patch";

vi.mock("@tgb-resolver/contracts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tgb-resolver/contracts")>()),
  patchTimelineEvent: vi.fn(),
}));

const imageEvent: TimelineEvent = {
  id: 7,
  position: 1,
  type: TimelineEventType.CUS,
  payload: { extId: "img", extPayload: { assetId: "asset-1", fit: "cover" } },
};

const queryClient = new QueryClient();

beforeEach(() => {
  showModel.showEvents.value = { [imageEvent.id]: imageEvent };
  playbackModel.state.value = { ...playbackModel.state.value, showVersion: 3 };
  vi.mocked(patchTimelineEvent).mockClear();
  vi.mocked(patchTimelineEvent).mockResolvedValue({ data: undefined } as never);
});

describe("patchExtensionPayload", () => {
  test("merges patch onto current payload and PATCHes with current showVersion", async () => {
    await patchExtensionPayload(queryClient, imageEvent.id, "img", { fit: "contain" });

    expect(patchTimelineEvent).toHaveBeenCalledTimes(1);
    const body = vi.mocked(patchTimelineEvent).mock.calls[0][0].body;
    expect(body.showVersion).toBe(3);
    expect(body.custom).toEqual({
      extId: "img",
      extPayload: { assetId: "asset-1", fit: "contain" },
    });
  });

  test("throws ValidationError and never PATCHes on invalid payload", async () => {
    await expect(
      patchExtensionPayload(queryClient, imageEvent.id, "img", { assetId: 1 }),
    ).rejects.toBeInstanceOf(ExtensionPayloadValidationError);

    expect(patchTimelineEvent).not.toHaveBeenCalled();
  });

  test("throws on unknown extension", async () => {
    await expect(patchExtensionPayload(queryClient, imageEvent.id, "nope", {})).rejects.toThrow(
      "Unknown extension",
    );

    expect(patchTimelineEvent).not.toHaveBeenCalled();
  });

  test("partial patch on a fresh event without extPayload is completed from config-form defaults", async () => {
    showModel.showEvents.value = {
      [imageEvent.id]: { ...imageEvent, payload: { extId: "img" } },
    };

    await patchExtensionPayload(queryClient, imageEvent.id, "img", {
      assetId: "asset-1",
      fit: "contain",
    });

    const body = vi.mocked(patchTimelineEvent).mock.calls[0][0].body;
    expect(body.custom).toEqual({
      extId: "img",
      extPayload: { assetId: "asset-1", fit: "contain" },
    });
  });

  test("extPayload keys not declared in the config form are dropped on save", async () => {
    showModel.showEvents.value = {
      [imageEvent.id]: {
        ...imageEvent,
        payload: { extId: "img", extPayload: { assetId: "asset-1", fit: "cover", stale: 1 } },
      },
    };

    await patchExtensionPayload(queryClient, imageEvent.id, "img", { fit: "contain" });

    const body = vi.mocked(patchTimelineEvent).mock.calls[0][0].body;
    expect(body.custom).toEqual({
      extId: "img",
      extPayload: { assetId: "asset-1", fit: "contain" },
    });
  });

  test("throws when the event is not a matching CUS event", async () => {
    await expect(
      patchExtensionPayload(queryClient, 999, "img", { fit: "contain" }),
    ).rejects.toThrow("not a img custom event");

    expect(patchTimelineEvent).not.toHaveBeenCalled();
  });

  test("includes durationSeconds in the body when provided", async () => {
    await patchExtensionPayload(queryClient, imageEvent.id, "img", { fit: "contain" }, 4.5);

    const body = vi.mocked(patchTimelineEvent).mock.calls[0][0].body;
    expect(body.durationSeconds).toBe(4.5);
    expect(body.custom).toEqual({
      extId: "img",
      extPayload: { assetId: "asset-1", fit: "contain" },
    });
  });

  test("omits durationSeconds from the body when not provided", async () => {
    await patchExtensionPayload(queryClient, imageEvent.id, "img", { fit: "contain" });

    const body = vi.mocked(patchTimelineEvent).mock.calls[0][0].body;
    expect(body).not.toHaveProperty("durationSeconds");
  });
});
