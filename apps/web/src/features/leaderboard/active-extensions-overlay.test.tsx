import { ChakraProvider } from "@chakra-ui/react";
import { act, cleanup, render } from "@testing-library/react";
import type { ShowFile } from "@tgb-resolver/realtime";
import { TimelineEventType } from "@tgb-resolver/realtime";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { playbackModel } from "@/features/control/playback-model";
import { ActiveExtensionsOverlay } from "@/features/leaderboard/leaderboard";
import { showModel } from "@/features/shared/show-model";
import { system } from "@/features/shared/ui/provider";

import { ScrollerExtension } from "../extensions/scroller";

function makeShowFile(
  cusEvents: Array<{ id: number; extId: string; extPayload?: Record<string, unknown> }>,
) {
  return {
    showVersion: 1,
    timeline: cusEvents.map(({ id, extId, extPayload }) => ({
      id,
      type: TimelineEventType.CUS,
      payload: { extId, ...(extPayload ? { extPayload } : {}) },
    })),
  } as unknown as ShowFile;
}

function setActive(ids: number[]) {
  act(() => {
    playbackModel.state.value = { ...playbackModel.state.value, activeEventIds: ids };
  });
}

const executeSpy = vi.spyOn(ScrollerExtension, "execute");
const cleanups: Array<() => void> = [];

beforeEach(() => {
  executeSpy.mockReset();
  cleanups.length = 0;
  executeSpy.mockImplementation(() => {
    const cleanup = vi.fn();
    cleanups.push(cleanup);
    return cleanup;
  });
  setActive([]);
});

afterEach(() => {
  cleanup();
  setActive([]);
  showModel.showFile.value = null;
});

describe("ActiveExtensionsOverlay", () => {
  test("mounts a blank overlay when the custom event becomes active", () => {
    const view = render(
      <ChakraProvider value={system}>
        <ActiveExtensionsOverlay timeline={makeShowFile([{ id: 1, extId: "blank" }])} />
      </ChakraProvider>,
    );
    setActive([1]);
    expect(view.container.querySelector("div[class^='css-']")).not.toBeNull();
    expect(view.container.innerHTML).not.toContain("Objects are not valid");
  });

  test("transitions from an exiting blank overlay to a mounting media overlay", () => {
    const timeline = makeShowFile([
      { id: 1, extId: "blank", extPayload: { color: "black" } },
      { id: 2, extId: "media", extPayload: { assetId: "asset-1", fit: "contain" } },
    ]);
    const view = render(
      <ChakraProvider value={system}>
        <ActiveExtensionsOverlay timeline={timeline} />
      </ChakraProvider>,
    );
    setActive([1]);
    setActive([2]);
    const imgs = view.container.querySelectorAll("img");
    expect(imgs.length).toBe(1);
    expect(imgs[0]?.getAttribute("src")).toBe("http://localhost:5001/assets/asset-1");
  });

  test("runs a ScriptOnly extension once per active event despite repeated state pushes", () => {
    const timeline = makeShowFile([{ id: 3, extId: "scroller", extPayload: { duration: 5 } }]);
    render(
      <ChakraProvider value={system}>
        <ActiveExtensionsOverlay timeline={timeline} />
      </ChakraProvider>,
    );

    setActive([3]);
    // A dev StrictMode re-invoke or a repeated RealTime push re-runs the effect.
    setActive([3]);
    setActive([3]);

    expect(executeSpy).toHaveBeenCalledTimes(1);
    expect(executeSpy).toHaveBeenCalledWith({ duration: 5 });
  });

  test("runs a ScriptOnly extension again after the event deactivates and re-activates", () => {
    const timeline = makeShowFile([{ id: 3, extId: "scroller", extPayload: { duration: 5 } }]);
    render(
      <ChakraProvider value={system}>
        <ActiveExtensionsOverlay timeline={timeline} />
      </ChakraProvider>,
    );

    setActive([3]);
    setActive([]);
    expect(cleanups).toHaveLength(1);
    expect(cleanups[0]).toHaveBeenCalledTimes(1);

    setActive([3]);
    expect(executeSpy).toHaveBeenCalledTimes(2);
  });

  test("stops all ScriptOnly extensions when the overlay unmounts", () => {
    const timeline = makeShowFile([{ id: 3, extId: "scroller", extPayload: { duration: 5 } }]);
    const view = render(
      <ChakraProvider value={system}>
        <ActiveExtensionsOverlay timeline={timeline} />
      </ChakraProvider>,
    );

    setActive([3]);
    view.unmount();
    expect(cleanups).toHaveLength(1);
    expect(cleanups[0]).toHaveBeenCalledTimes(1);
  });
});
