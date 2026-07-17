import { QueryClient } from "@tanstack/preact-query";
import { PlaybackStatus, type ShowStateSnapshot } from "@tgb-resolver/contracts";
import { ShowRefetchReason } from "@tgb-resolver/realtime";
import { describe, expect, test, vi } from "vitest";

import { applyControlRealtimeMessage, controlShowQueryKey } from "./realtime-cache";

describe("applyControlRealtimeMessage", () => {
  test("patches cached playback state when a newer playback update arrives", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(controlShowQueryKey(), {
      showVersion: 1,
      playback: {
        status: PlaybackStatus.IDLE,
      },
    } satisfies Partial<ShowStateSnapshot>);

    await applyControlRealtimeMessage(queryClient, {
      type: "playback-state-changed",
      showVersion: 2,
      playback: {
        status: PlaybackStatus.RUNNING,
        executionSequence: 1,
        currentResolveEventId: 4,
      },
    });

    expect(queryClient.getQueryData(controlShowQueryKey())).toMatchObject({
      showVersion: 2,
      playback: {
        status: PlaybackStatus.RUNNING,
        currentResolveEventId: 4,
      },
    });
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

  test("invalidates the show query when a playback sequence is missing", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    queryClient.setQueryData(controlShowQueryKey(), {
      showVersion: 1,
      playback: { status: PlaybackStatus.RUNNING, executionSequence: 1 },
    } satisfies Partial<ShowStateSnapshot>);

    await applyControlRealtimeMessage(queryClient, {
      type: "playback-state-changed",
      showVersion: 3,
      playback: { status: PlaybackStatus.RUNNING, executionSequence: 3 },
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: controlShowQueryKey() });
  });
});
