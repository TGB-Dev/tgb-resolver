import { QueryClient } from "@tanstack/react-query";
import type { ShowStateSnapshot } from "@tgb-resolver/contracts";
import { describe, expect, test, vi } from "vitest";

import { applyControlRealtimeMessage, controlShowQueryKey } from "./realtime-cache";

describe("applyControlRealtimeMessage", () => {
  test("patches cached playback state when a newer playback update arrives", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(controlShowQueryKey(), {
      showVersion: 1,
      playback: {
        status: "Idle",
      },
    } satisfies Partial<ShowStateSnapshot>);

    await applyControlRealtimeMessage(queryClient, {
      type: "playback-state-changed",
      showVersion: 2,
      playback: {
        status: "running",
        currentResolveEventId: 4,
      },
    });

    expect(queryClient.getQueryData(controlShowQueryKey())).toMatchObject({
      showVersion: 2,
      playback: {
        status: "Running",
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
      reason: "optimized",
    });

    expect(invalidateSpy).toHaveBeenCalled();
  });
});
