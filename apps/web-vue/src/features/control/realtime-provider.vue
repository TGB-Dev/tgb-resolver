<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";
import type { ShowWebSocketMessage } from "@tgb-resolver/realtime";
import { ShowConnectionStatus } from "@tgb-resolver/realtime";
import { onUnmounted, ref, watch } from "vue";

import BigRefetchOverlay from "@/features/control/big-refetch-overlay.vue";
import { useControlShowQuery } from "@/features/control/composables/use-show";
import { usePlaybackStore } from "@/features/control/playback-store";
import { connectRealtime } from "@/lib/realtime-client";
import { useRealtimeStore } from "@/stores/realtime-store";
import { useShowStore } from "@/stores/show-store";

import { applyControlRealtimeMessage, controlShowQueryKey } from "./realtime-handler";

const queryClient = useQueryClient();
const realtimeStore = useRealtimeStore();
const showStore = useShowStore();
const playbackStore = usePlaybackStore();

const showQuery = useControlShowQuery();

let disconnect: (() => void) | null = null;
disconnect = connectRealtime(
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

onUnmounted(() => {
  disconnect?.();
});

const syncPlaybackRef = ref(false);

watch(
  () => showQuery.data.value,
  (data) => {
    if (!data?.playback) {
      return;
    }

    showStore.hydrateFromSnapshot(data);

    playbackStore.syncVersion(data.showVersion ?? 0);

    if (!syncPlaybackRef.value) {
      syncPlaybackRef.value = true;
      playbackStore.syncFromSnapshot(data.showVersion ?? 0, data.playback);
    }

    realtimeStore.bigRefetching = false;
  },
);
</script>

<template>
  <slot />
  <BigRefetchOverlay />
</template>
