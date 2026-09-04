import type { QueryClient } from "@tanstack/vue-query";
import {
  generatedClient,
  tgbResolverServerFeaturesShowGetShowEndpointQueryKey,
} from "@tgb-resolver/contracts";
import { ShowMessageType, type ShowWebSocketMessage } from "@tgb-resolver/realtime";

import { usePlaybackStore } from "@/features/control/playback-store";
import { useAnimationsStore } from "@/features/leaderboard/animations-store";
import { useRealtimeStore } from "@/stores/realtime-store";
import { useShowStore } from "@/stores/show-store";

export function controlShowQueryKey() {
  return tgbResolverServerFeaturesShowGetShowEndpointQueryKey({ client: generatedClient });
}

export function applyControlRealtimeMessage(
  queryClient: QueryClient,
  message: ShowWebSocketMessage,
) {
  const playbackStore = usePlaybackStore();
  const showStore = useShowStore();
  const realtimeStore = useRealtimeStore();
  const animationsStore = useAnimationsStore();

  switch (message.type) {
    case ShowMessageType.PlaybackStateChanged:
      // Playback carries the (unchanged) DATA showVersion; never refetch, never drift the data version.
      animationsStore.previousEventId = playbackStore.state.currentEventId;
      playbackStore.syncFromSnapshot(message.showVersion, message.playback);
      return;

    case ShowMessageType.LiveModeChanged:
      if (!showStore.tryAdvanceShowVersion(message.showVersion)) {
        realtimeStore.bigRefetching = true;
        void queryClient.invalidateQueries({ queryKey: controlShowQueryKey() });
        return;
      }
      showStore.showMode = message.mode;
      playbackStore.syncVersion(message.showVersion);
      return;

    case ShowMessageType.ShowReplaced:
      // Wholesale replace (import/clear): refetch the whole show. Rare + user-initiated,
      // so a full refetch is correct and avoids mapping the large snapshot.
      realtimeStore.bigRefetching = true;
      void queryClient.invalidateQueries({ queryKey: controlShowQueryKey() });
      return;

    case ShowMessageType.TimelineEventAdded:
    case ShowMessageType.TimelineEventUpdated:
    case ShowMessageType.TimelineEventRemoved:
    case ShowMessageType.TimelineReordered:
      if (showStore.tryApplyShowMessage(message)) {
        playbackStore.syncVersion(message.showVersion);
      } else {
        // Version gap (missed message / late join) -> repair via whole-show refetch (original desync design).
        realtimeStore.bigRefetching = true;
        void queryClient.invalidateQueries({ queryKey: controlShowQueryKey() });
      }
      return;
  }
}
