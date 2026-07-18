import { QueryClient } from "@tanstack/react-query";
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
import { beforeEach, describe, expect, test, vi } from "vitest";

import { playbackSignal, syncPlaybackFromSnapshot } from "@/models/playback-state";

import { applyControlRealtimeMessage, controlShowQueryKey } from "./realtime-cache";
import { dataVersion, hydrateShowFromSnapshot, showEvents, showMode } from "./show-store";

const baseShow: ShowFile = {
  schemaVersion: 1,
  showVersion: 1,
  mode: ShowMode.EDITING,
  timelineMode: TimelineMode.RW,
  meta: { title: "t", source: ShowSource.MANUAL },
  contest: { durationSeconds: 0, freezeDurationSeconds: 0, preFreezeSnapshot: [] },
  automation: { autoResolveEnabled: false, autoResolveSpeedMs: 3000, fullAutoEnabled: false },
  playback: { status: PlaybackStatus.IDLE, executionSequence: 0 },
  assets: { images: [], sfx: [] },
  timeline: [
    {
      id: 1,
      position: 1,
      type: TimelineEventType.RES,
      payload: {
        realName: "A",
        username: "a",
        problem: "p",
        newTotalScore: 10,
        newRank: 1,
        newProblemScore: 0,
        problemDisplayName: "P",
        verdict: VerdictRunResult.UNKNOWN,
      },
    },
  ],
};

beforeEach(() => {
  playbackSignal.value = {
    showVersion: 0,
    status: "Idle",
    executionSequence: 0,
    currentResolveEventId: null,
    currentEventId: null,
    activeSegment: null,
    startedAt: null,
  };
  hydrateShowFromSnapshot(baseShow);
});

describe("applyControlRealtimeMessage", () => {
  test("updates the playback signal when a playback update arrives", async () => {
    const queryClient = new QueryClient();

    await applyControlRealtimeMessage(queryClient, {
      type: ShowMessageType.PlaybackStateChanged,
      showVersion: 2,
      playback: {
        status: PlaybackStatus.RUNNING,
        executionSequence: 1,
        currentResolveEventId: 4,
      },
    });

    expect(playbackSignal.value).toMatchObject({
      status: PlaybackStatus.RUNNING,
      executionSequence: 1,
      currentResolveEventId: 4,
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
      playback: { status: PlaybackStatus.RUNNING, executionSequence: 1, currentResolveEventId: 4 },
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

  test("does not reset playback signal on a wholesale replace", async () => {
    playbackSignal.value = {
      showVersion: 2,
      status: "Running",
      executionSequence: 5,
      currentResolveEventId: 42,
      currentEventId: null,
      activeSegment: null,
      startedAt: null,
    };

    await applyControlRealtimeMessage(new QueryClient(), {
      type: ShowMessageType.ShowReplaced,
      showVersion: 3,
    });

    expect(playbackSignal.value.currentResolveEventId).toBe(42);
    expect(playbackSignal.value.executionSequence).toBe(5);
    expect(playbackSignal.value.showVersion).toBe(2);
  });

  test("patches the store for a live-mode change without refetching", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    showMode.value = ShowMode.EDITING;

    await applyControlRealtimeMessage(queryClient, {
      type: ShowMessageType.LiveModeChanged,
      showVersion: 3,
      mode: ShowMode.LIVE,
    });

    expect(showMode.value).toBe(ShowMode.LIVE);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  test("patches the store for a granular timeline add", async () => {
    const addedEvent: TimelineEvent = {
      id: 2,
      position: 2,
      type: TimelineEventType.SFX,
      payload: { sfxId: "x", durationSeconds: 1 },
    };

    await applyControlRealtimeMessage(new QueryClient(), {
      type: ShowMessageType.TimelineEventAdded,
      showVersion: 2,
      event: addedEvent,
    });

    expect(showEvents.value.has(2)).toBe(true);
    expect(dataVersion.value).toBe(2);
  });

  test("repairs via refetch when a granular diff arrives out of order", async () => {
    const invalidateSpy = vi.spyOn(QueryClient.prototype, "invalidateQueries");
    const addedEvent: TimelineEvent = {
      id: 2,
      position: 2,
      type: TimelineEventType.SFX,
      payload: { sfxId: "x", durationSeconds: 1 },
    };

    await applyControlRealtimeMessage(new QueryClient(), {
      type: ShowMessageType.TimelineEventAdded,
      showVersion: 9,
      event: addedEvent,
    });

    expect(showEvents.value.has(2)).toBe(false);
    expect(invalidateSpy).toHaveBeenCalled();
  });

  test("syncs playback from snapshot data", () => {
    syncPlaybackFromSnapshot(5, {
      status: PlaybackStatus.RUNNING,
      executionSequence: 3,
      currentResolveEventId: 7,
      currentEventId: 8,
      activeSegment: {
        resolveEventId: 7,
        nextResolveEventId: 10,
        inlineEventIds: [8, 9],
        currentInlineIndex: 0,
      },
      startedAt: 1000,
    });

    expect(playbackSignal.value).toMatchObject({
      showVersion: 5,
      status: PlaybackStatus.RUNNING,
      executionSequence: 3,
      currentResolveEventId: 7,
      currentEventId: 8,
    });
  });
});
