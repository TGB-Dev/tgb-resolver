import { QueryClient } from "@tanstack/react-query";
import { PlaybackStatus, ShowMode, type ShowStateSnapshot } from "@tgb-resolver/contracts";
import { ShowRefetchReason } from "@tgb-resolver/realtime";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { playbackSignal, syncPlaybackFromSnapshot } from "@/models/playback-state";

import { applyControlRealtimeMessage, controlShowQueryKey } from "./realtime-cache";

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
});

describe("applyControlRealtimeMessage", () => {
  test("updates the playback signal when a playback update arrives", async () => {
    const queryClient = new QueryClient();

    await applyControlRealtimeMessage(queryClient, {
      type: "playback-state-changed",
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
    } satisfies Partial<ShowStateSnapshot>;
    queryClient.setQueryData(controlShowQueryKey(), initial);

    await applyControlRealtimeMessage(queryClient, {
      type: "playback-state-changed",
      showVersion: 2,
      playback: { status: PlaybackStatus.RUNNING, executionSequence: 1, currentResolveEventId: 4 },
    });

    expect(queryClient.getQueryData(controlShowQueryKey())).toEqual(initial);
  });

  test("invalidates the show query for structural realtime messages", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await applyControlRealtimeMessage(queryClient, {
      type: "show-refetch-required",
      showVersion: 3,
      reason: ShowRefetchReason.Optimized,
    });

    expect(invalidateSpy).toHaveBeenCalled();
  });

  test("does not reset playback signal on show-refetch-required", async () => {
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
      type: "show-refetch-required",
      showVersion: 3,
      reason: ShowRefetchReason.Optimized,
    });

    expect(playbackSignal.value.currentResolveEventId).toBe(42);
    expect(playbackSignal.value.executionSequence).toBe(5);
    expect(playbackSignal.value.showVersion).toBe(2);
  });

  test("invalidates the show query for live-mode-changed", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await applyControlRealtimeMessage(queryClient, {
      type: "live-mode-changed",
      showVersion: 3,
      mode: ShowMode.LIVE,
    });

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
