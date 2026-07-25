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

import { playbackModel, showModel } from "@/models";

import { applyControlRealtimeMessage, controlShowQueryKey } from "./realtime-handler";

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

beforeEach(() => {
  playbackModel.reset();
  showModel.hydrateFromSnapshot(baseShow);
});

describe("applyControlRealtimeMessage", () => {
  test("updates the playback signal when a playback update arrives", async () => {
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

    expect(playbackModel.state.value).toMatchObject({
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

  test("does not reset playback signal on a wholesale replace", async () => {
    playbackModel.update({
      showVersion: 2,
      status: "Running",
      currentEventId: 42,
      activeEventIds: [42],
    });

    await applyControlRealtimeMessage(new QueryClient(), {
      type: ShowMessageType.ShowReplaced,
      showVersion: 3,
    });

    expect(playbackModel.state.value.currentEventId).toBe(42);
    expect(playbackModel.state.value.showVersion).toBe(2);
  });

  test("patches the store for a live-mode change without refetching", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    showModel.showMode.value = ShowMode.EDITING;

    await applyControlRealtimeMessage(queryClient, {
      type: ShowMessageType.LiveModeChanged,
      showVersion: 3,
      mode: ShowMode.LIVE,
    });

    expect(showModel.showMode.value).toBe(ShowMode.LIVE);
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

    expect(2 in showModel.showEvents.value).toBe(true);
    expect(showModel.dataVersion.value).toBe(2);
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

    expect(2 in showModel.showEvents.value).toBe(false);
    expect(invalidateSpy).toHaveBeenCalled();
  });

  test("syncs playback from snapshot data", () => {
    playbackModel.syncFromSnapshot(5, {
      status: PlaybackStatus.RUNNING,
      currentEventId: 8,
      activeEventIds: [8],
      startedAt: 1000,
    });

    expect(playbackModel.state.value).toMatchObject({
      showVersion: 5,
      status: PlaybackStatus.RUNNING,
      currentEventId: 8,
      activeEventIds: [8],
    });
  });
});
