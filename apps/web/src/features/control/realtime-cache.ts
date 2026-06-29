import type { QueryClient } from "@tanstack/react-query";
import {
  generatedClient,
  type ShowStateSnapshot,
  tgbResolverServerEndpointsGetShowEndpointQueryKey,
} from "@tgb-resolver/contracts";
import type { ShowWebSocketMessage } from "@tgb-resolver/realtime";

function toSnapshotPlaybackStatus(
  status: "idle" | "running" | "paused" | "completed",
): NonNullable<ShowStateSnapshot["playback"]>["status"] {
  switch (status) {
    case "running":
      return "Running";
    case "paused":
      return "Paused";
    case "completed":
      return "Completed";
    default:
      return "Idle";
  }
}

export function controlShowQueryKey() {
  return tgbResolverServerEndpointsGetShowEndpointQueryKey({ client: generatedClient });
}

export async function applyControlRealtimeMessage(
  queryClient: QueryClient,
  message: ShowWebSocketMessage,
) {
  if (message.type === "playback-state-changed") {
    queryClient.setQueryData<ShowStateSnapshot | undefined>(controlShowQueryKey(), (current) => {
      if (!current || message.showVersion <= (current.showVersion ?? 0)) {
        return current;
      }

      return {
        ...current,
        showVersion: message.showVersion,
        playback: {
          status: toSnapshotPlaybackStatus(message.playback.status),
          currentResolveEventId: message.playback.currentResolveEventId ?? null,
          currentEventId: message.playback.currentEventId ?? null,
          activeSegment: message.playback.activeSegment
            ? {
                resolveEventId: message.playback.activeSegment.resolveEventId,
                nextResolveEventId: message.playback.activeSegment.nextResolveEventId ?? null,
                inlineEventIds: message.playback.activeSegment.inlineEventIds,
                currentInlineIndex: message.playback.activeSegment.currentInlineIndex,
              }
            : null,
          startedAt: message.playback.startedAt ?? null,
        },
      };
    });

    return;
  }

  await queryClient.invalidateQueries({
    queryKey: controlShowQueryKey(),
  });
}
