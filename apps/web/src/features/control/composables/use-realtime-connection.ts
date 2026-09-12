import { useQueryClient } from "@tanstack/vue-query";
import type { ShowWebSocketMessage } from "@tgb-resolver/realtime";
import { ShowConnectionStatus } from "@tgb-resolver/realtime";
import { onScopeDispose, watch } from "vue";

import { useControlShowQuery } from "@/features/control/composables/use-show";
import { usePlaybackStore } from "@/features/control/playback-store";
import {
  applyControlRealtimeMessage,
  controlShowQueryKey,
} from "@/features/control/realtime-handler";
import { connectRealtime } from "@/lib/realtime-client";
import { useRealtimeStore } from "@/stores/realtime-store";
import { useShowStore } from "@/stores/show-store";
import { preloadAssets } from "@/utils/preload-assets";

export function useRealtimeConnection() {
  const queryClient = useQueryClient();
  const realtimeStore = useRealtimeStore();
  const showStore = useShowStore();
  const playbackStore = usePlaybackStore();

  const showQuery = useControlShowQuery();
  const syncPlaybackRef = { current: false };

  const disconnect = connectRealtime(
    (status) => {
      realtimeStore.connectionStatus = status;
      if (status === ShowConnectionStatus.Connected) {
        void queryClient.invalidateQueries({ queryKey: controlShowQueryKey() });
      }
    },
    (message: ShowWebSocketMessage) => {
      void applyControlRealtimeMessage(queryClient, message);
    },
  );

  watch(showQuery.data, (data) => {
    if (!data?.playback) return;
    showStore.hydrateFromSnapshot(data);
    playbackStore.syncVersion(data.showVersion ?? 0);
    if (!syncPlaybackRef.current) {
      syncPlaybackRef.current = true;
      playbackStore.syncFromSnapshot(data.showVersion ?? 0, data.playback);
    }
    realtimeStore.bigRefetching = false;
    const assets = data.assets;
    if (assets?.items && assets.items.length > 0) {
      void preloadAssets(assets);
    }
  });

  onScopeDispose(() => disconnect());
}
