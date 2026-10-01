import { HotkeysProvider } from "@tanstack/vue-hotkeys";
import { PlaybackStatus, ShowMode } from "@tgb-resolver/contracts";
import {
  type ShowFile,
  ShowConnectionStatus,
  ShowSource,
  type TimelineEvent,
  TimelineEventType,
  TimelineMode,
  VerdictRunResult,
} from "@tgb-resolver/realtime";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";

import { usePlaybackStore } from "@/features/control/playback-store";
import { useRealtimeStore } from "@/stores/realtime-store";
import { useShowStore } from "@/stores/show-store";

import { useShortcutsStore } from "../shortcuts-store";
import { CommandScope } from "../types";
import { useShortcutsRegistration } from "../use-shortcuts";

const { mockSeek } = vi.hoisted(() => ({ mockSeek: vi.fn() }));

vi.mock("@tgb-resolver/contracts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tgb-resolver/contracts")>();
  return { ...actual, seekPlayback: mockSeek };
});

let resolvers: Array<() => void> = [];

function pressKey(key: string): void {
  document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

const Harness = defineComponent({
  setup() {
    useShortcutsRegistration();
    return () => h("div");
  },
});
const Wrapper = defineComponent({
  setup() {
    return () => h(HotkeysProvider, () => h(Harness));
  },
});

function timelineEvent(id: number): TimelineEvent {
  return {
    id,
    position: id,
    type: TimelineEventType.RES,
    payload: {
      userId: 1,
      problemId: 1,
      newTotalScore: 10,
      newTotalPenalty: 0,
      newRank: 1,
      newProblemScore: 0,
      verdict: VerdictRunResult.UNKNOWN,
      timeSinceStart: 0,
    },
  };
}

const baseShow: ShowFile = {
  schemaVersion: 1,
  showVersion: 1,
  mode: ShowMode.EDITING,
  timelineMode: TimelineMode.RW,
  meta: { title: "t", source: ShowSource.MANUAL },
  contest: {
    durationSeconds: 0,
    freezeDurationSeconds: 0,
    problems: [],
    users: [],
    preFreezeSnapshot: [],
  },
  automation: { autoResolveEnabled: false, autoResolveSpeedMs: 3000, fullAutoEnabled: false },
  playback: { status: PlaybackStatus.IDLE, activeEventIds: [] },
  assets: { items: [], folders: [] },
  timeline: [timelineEvent(1), timelineEvent(2), timelineEvent(3)],
};

describe("transport seek repeat guard", () => {
  beforeEach(() => {
    const pinia = createPinia();
    setActivePinia(pinia);
    useShortcutsStore().setActiveScopes([CommandScope.Control]);
    useShowStore().hydrateFromSnapshot(baseShow);
    usePlaybackStore().update({ status: PlaybackStatus.RUNNING, showVersion: 1 });
    useRealtimeStore().connectionStatus = ShowConnectionStatus.Connected;
    mockSeek.mockReset();
    mockSeek.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvers.push(resolve);
        }),
    );
    resolvers = [];
    mount(Wrapper, { global: { plugins: [pinia] } });
  });

  afterEach(async () => {
    for (const resolve of resolvers) resolve();
    resolvers = [];
    await flush();
  });

  it("holding ArrowRight re-seeks the boundary item only once while pending", async () => {
    usePlaybackStore().update({ currentEventId: 2 });
    pressKey("ArrowRight");
    pressKey("ArrowRight");
    pressKey("ArrowRight");
    expect(mockSeek).toHaveBeenCalledTimes(1);
    expect(mockSeek).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.objectContaining({ eventId: 3 }) }),
    );
  });

  it("does not overseek past the last item once it becomes current", async () => {
    usePlaybackStore().update({ currentEventId: 2 });
    pressKey("ArrowRight");
    expect(mockSeek).toHaveBeenCalledTimes(1);
    for (const resolve of resolvers) resolve();
    resolvers = [];
    await flush();
    usePlaybackStore().update({ currentEventId: 3 });
    pressKey("ArrowRight");
    pressKey("ArrowRight");
    expect(mockSeek).toHaveBeenCalledTimes(1);
  });

  it("holding ArrowLeft on the first item seeks nothing", () => {
    usePlaybackStore().update({ currentEventId: 1 });
    pressKey("ArrowLeft");
    pressKey("ArrowLeft");
    expect(mockSeek).not.toHaveBeenCalled();
  });

  it("allows a fresh seek once the previous one settles", async () => {
    usePlaybackStore().update({ currentEventId: 1 });
    pressKey("ArrowRight");
    expect(mockSeek).toHaveBeenCalledTimes(1);
    for (const resolve of resolvers) resolve();
    resolvers = [];
    await flush();
    pressKey("ArrowRight");
    expect(mockSeek).toHaveBeenCalledTimes(2);
  });
});
