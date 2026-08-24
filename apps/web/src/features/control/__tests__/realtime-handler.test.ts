import { QueryClient } from "@tanstack/vue-query";
import { PlaybackStatus, ShowMode } from "@tgb-resolver/contracts";
import {
  type ShowFile,
  ShowMessageType,
  ShowSource,
  type TimelineEvent,
  TimelineEventType,
  TimelineMode,
  VerdictRunResult,
} from "@tgb-resolver/realtime";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { usePlaybackStore } from "@/features/control/playback-store";
import { useAnimationsStore } from "@/features/leaderboard/animations-store";
import { useShowStore } from "@/stores/show-store";

import { applyControlRealtimeMessage, controlShowQueryKey } from "../realtime-handler";

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
  assets: { items: [] },
  timeline: [
    {
      id: 1,
      position: 1,
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
    },
  ],
};

let playbackStore: ReturnType<typeof usePlaybackStore>;
let showStore: ReturnType<typeof useShowStore>;
let animationsStore: ReturnType<typeof useAnimationsStore>;

beforeEach(() => {
  setActivePinia(createPinia());
  playbackStore = usePlaybackStore();
  showStore = useShowStore();
  animationsStore = useAnimationsStore();
  playbackStore.reset();
  showStore.hydrateFromSnapshot(baseShow);
  animationsStore.reset();
});

describe("applyControlRealtimeMessage", () => {
  test("updates the playback store when a playback update arrives", async () => {
    const queryClient = new QueryClient();

    await applyControlRealtimeMessage(queryClient, {
      type: ShowMessageType.PlaybackStateChanged,
      showVersion: 2,
      playback: {
        status: PlaybackStatus.RUNNING,
        currentEventId: 4,
        activeEventIds: [4],
      },
    });

    expect(playbackStore.state).toMatchObject({
      status: PlaybackStatus.RUNNING,
      currentEventId: 4,
      activeEventIds: [4],
    });
  });

  test("does not touch the query cache for playback updates", async () => {
    const queryClient = new QueryClient();
    const initial = {
      showVersion: 1,
      playback: { status: PlaybackStatus.IDLE },
    } satisfies Partial<ShowFile>;
    queryClient.setQueryData(controlShowQueryKey(), initial);

    await applyControlRealtimeMessage(queryClient, {
      type: ShowMessageType.PlaybackStateChanged,
      showVersion: 2,
      playback: { status: PlaybackStatus.RUNNING, currentEventId: 4, activeEventIds: [4] },
    });

    expect(queryClient.getQueryData(controlShowQueryKey())).toEqual(initial);
  });

  test("invalidates the show query for a wholesale replace", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await applyControlRealtimeMessage(queryClient, {
      type: ShowMessageType.ShowReplaced,
      showVersion: 3,
    });

    expect(invalidateSpy).toHaveBeenCalled();
  });

  test("does not reset playback store on a wholesale replace", async () => {
    playbackStore.update({
      showVersion: 2,
      status: "Running",
      currentEventId: 42,
      activeEventIds: [42],
    });

    await applyControlRealtimeMessage(new QueryClient(), {
      type: ShowMessageType.ShowReplaced,
      showVersion: 3,
    });

    expect(playbackStore.state.currentEventId).toBe(42);
    expect(playbackStore.state.showVersion).toBe(2);
  });

  test("patches the store for a live-mode change without refetching", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    showStore.showMode = ShowMode.EDITING;

    await applyControlRealtimeMessage(queryClient, {
      type: ShowMessageType.LiveModeChanged,
      showVersion: 2,
      mode: ShowMode.LIVE,
    });

    expect(showStore.showMode).toBe(ShowMode.LIVE);
    expect(showStore.dataVersion).toBe(2);
    expect(playbackStore.state.showVersion).toBe(2);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  test("patches the store for a granular timeline add", async () => {
    const addedEvent: TimelineEvent = {
      id: 2,
      position: 2,
      type: TimelineEventType.CUS,
      payload: { extId: "timer", extPayload: { minutes: 1 } },
    };

    await applyControlRealtimeMessage(new QueryClient(), {
      type: ShowMessageType.TimelineEventAdded,
      showVersion: 2,
      event: addedEvent,
    });

    expect(2 in showStore.showEvents).toBe(true);
    expect(showStore.dataVersion).toBe(2);
    expect(playbackStore.state.showVersion).toBe(2);
  });

  test("repairs via refetch when a granular diff arrives out of order", async () => {
    const invalidateSpy = vi.spyOn(QueryClient.prototype, "invalidateQueries");
    const addedEvent: TimelineEvent = {
      id: 2,
      position: 2,
      type: TimelineEventType.CUS,
      payload: { extId: "timer", extPayload: { minutes: 1 } },
    };

    await applyControlRealtimeMessage(new QueryClient(), {
      type: ShowMessageType.TimelineEventAdded,
      showVersion: 9,
      event: addedEvent,
    });

    expect(2 in showStore.showEvents).toBe(false);
    expect(invalidateSpy).toHaveBeenCalled();
  });

  test("syncs playback from snapshot data", () => {
    playbackStore.syncFromSnapshot(5, {
      status: PlaybackStatus.RUNNING,
      currentEventId: 8,
      activeEventIds: [8],
      startedAt: 1000,
    });

    expect(playbackStore.state).toMatchObject({
      showVersion: 5,
      status: PlaybackStatus.RUNNING,
      currentEventId: 8,
      activeEventIds: [8],
    });
  });

  test("flags animation skip on a far seek", async () => {
    const queryClient = new QueryClient();
    showStore.showOrderedIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    playbackStore.syncFromSnapshot(1, {
      status: PlaybackStatus.IDLE,
      currentEventId: 1,
      activeEventIds: [1],
    });

    await applyControlRealtimeMessage(queryClient, {
      type: ShowMessageType.PlaybackStateChanged,
      showVersion: 2,
      playback: { status: PlaybackStatus.IDLE, currentEventId: 11, activeEventIds: [11] },
    });

    expect(animationsStore.skipNumberAnimations).toBe(true);
    expect(playbackStore.state.currentEventId).toBe(11);
  });

  test("does not flag animation skip on an adjacent seek", async () => {
    const queryClient = new QueryClient();
    showStore.showOrderedIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    playbackStore.syncFromSnapshot(1, {
      status: PlaybackStatus.IDLE,
      currentEventId: 1,
      activeEventIds: [1],
    });

    await applyControlRealtimeMessage(queryClient, {
      type: ShowMessageType.PlaybackStateChanged,
      showVersion: 2,
      playback: { status: PlaybackStatus.IDLE, currentEventId: 2, activeEventIds: [2] },
    });

    expect(animationsStore.skipNumberAnimations).toBe(false);
  });

  test("flags animation skip when the cursor resets to null", async () => {
    const queryClient = new QueryClient();
    showStore.showOrderedIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    playbackStore.syncFromSnapshot(1, {
      status: PlaybackStatus.IDLE,
      currentEventId: 5,
      activeEventIds: [5],
    });

    await applyControlRealtimeMessage(queryClient, {
      type: ShowMessageType.PlaybackStateChanged,
      showVersion: 2,
      playback: { status: PlaybackStatus.IDLE, currentEventId: null, activeEventIds: [] },
    });

    expect(animationsStore.skipNumberAnimations).toBe(true);
  });
});
