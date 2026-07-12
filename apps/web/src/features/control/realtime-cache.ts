import type { QueryClient } from "@tanstack/react-query";
import {
  generatedClient,
  type ShowStateSnapshot,
  tgbResolverServerFeaturesShowGetShowEndpointQueryKey,
} from "@tgb-resolver/contracts";
import type { ShowWebSocketMessage } from "@tgb-resolver/realtime";

export function controlShowQueryKey() {
  return tgbResolverServerFeaturesShowGetShowEndpointQueryKey({ client: generatedClient });
}

export async function applyControlRealtimeMessage(
  queryClient: QueryClient,
  message: ShowWebSocketMessage,
) {
  if (message.type === "playback-state-changed") {
    const current = queryClient.getQueryData<ShowStateSnapshot>(controlShowQueryKey());
    const currentSequence = current?.playback?.executionSequence ?? 0;
    if (message.playback.executionSequence > currentSequence + 1) {
      await queryClient.invalidateQueries({ queryKey: controlShowQueryKey() });
      return;
    }

    queryClient.setQueryData<ShowStateSnapshot | undefined>(controlShowQueryKey(), (current) => {
      if (
        !current ||
        message.showVersion <= (current.showVersion ?? 0) ||
        message.playback.executionSequence <= (current.playback?.executionSequence ?? 0)
      ) {
        return current;
      }

      return {
        ...current,
        showVersion: message.showVersion,
        playback: {
          status: message.playback.status,
          executionSequence: message.playback.executionSequence,
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
