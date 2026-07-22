import type { QueryClient } from "@tanstack/react-query";
import {
  generatedClient,
  tgbResolverServerFeaturesShowGetShowEndpointQueryKey,
} from "@tgb-resolver/contracts";
import { ShowMessageType, type ShowWebSocketMessage } from "@tgb-resolver/realtime";

import { playbackModel, realtimeModel, showModel } from "@/models";

export function controlShowQueryKey() {
  return tgbResolverServerFeaturesShowGetShowEndpointQueryKey({ client: generatedClient });
}

export function applyControlRealtimeMessage(
  queryClient: QueryClient,
  message: ShowWebSocketMessage,
) {
  switch (message.type) {
    case ShowMessageType.PlaybackStateChanged:
      // Playback carries the (unchanged) DATA showVersion; never refetch, never drift the data version.
      playbackModel.syncFromSnapshot(message.showVersion, message.playback);
      return;

    case ShowMessageType.LiveModeChanged:
      showModel.showMode.value = message.mode;
      return;

    case ShowMessageType.ShowReplaced:
      // Wholesale replace (import/clear): refetch the whole show. Rare + user-initiated,
      // so a full refetch is correct and avoids mapping the large snapshot.
      realtimeModel.bigRefetching.value = true;
      void queryClient.invalidateQueries({ queryKey: controlShowQueryKey() });
      return;

    case ShowMessageType.TimelineEventAdded:
    case ShowMessageType.TimelineEventUpdated:
    case ShowMessageType.TimelineEventRemoved:
    case ShowMessageType.TimelineReordered:
      if (!showModel.tryApplyShowMessage(message)) {
        // Version gap (missed message / late join) -> repair via whole-show refetch (original desync design).
        realtimeModel.bigRefetching.value = true;
        void queryClient.invalidateQueries({ queryKey: controlShowQueryKey() });
      }
      return;
  }
}
