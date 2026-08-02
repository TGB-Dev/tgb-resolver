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
  vi.mocked(patchNonResolveEvent).mockClear();
  vi.mocked(patchNonResolveEvent).mockResolvedValue({ data: undefined } as never);
});

describe("patchExtensionPayload", () => {
  test("merges patch onto current payload and PATCHes with current showVersion", async () => {
    await patchExtensionPayload(queryClient, imageEvent.id, "img", { fit: "contain" });

    expect(patchNonResolveEvent).toHaveBeenCalledTimes(1);
    const body = vi.mocked(patchNonResolveEvent).mock.calls[0][0].body;
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

    expect(patchNonResolveEvent).not.toHaveBeenCalled();
  });

  test("throws on unknown extension", async () => {
    await expect(patchExtensionPayload(queryClient, imageEvent.id, "nope", {})).rejects.toThrow(
      "Unknown extension",
    );

    expect(patchNonResolveEvent).not.toHaveBeenCalled();
  });

  test("partial patch on a fresh event without extPayload is completed from config-form defaults", async () => {
    showModel.showEvents.value = {
      [imageEvent.id]: { ...imageEvent, payload: { extId: "img" } },
    };

    await patchExtensionPayload(queryClient, imageEvent.id, "img", {
      assetId: "asset-1",
      fit: "contain",
    });

    const body = vi.mocked(patchNonResolveEvent).mock.calls[0][0].body;
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

    const body = vi.mocked(patchNonResolveEvent).mock.calls[0][0].body;
    expect(body.custom).toEqual({
      extId: "img",
      extPayload: { assetId: "asset-1", fit: "contain" },
    });
  });

  test("throws when the event is not a matching CUS event", async () => {
    await expect(
      patchExtensionPayload(queryClient, 999, "img", { fit: "contain" }),
    ).rejects.toThrow("not a img custom event");

    expect(patchNonResolveEvent).not.toHaveBeenCalled();
  });
});
