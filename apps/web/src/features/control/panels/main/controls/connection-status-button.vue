<script setup lang="ts">
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { button } from "@styled-system/recipes";
import { ShowConnectionStatus } from "@tgb-resolver/realtime";
import { computed } from "vue";

import Tooltip from "@/features/shared/ui/tooltip.vue";
import { useRealtimeStore } from "@/stores/realtime-store";

const realtimeStore = useRealtimeStore();

const connectionLabel = computed(() => getConnectionStatusLabel(realtimeStore.connectionStatus));

function getConnectionStatusLabel(status: ShowConnectionStatus) {
  switch (status) {
    case ShowConnectionStatus.Connected:
      return "Connected";
    case ShowConnectionStatus.Connecting:
      return "Connecting";
    case ShowConnectionStatus.Reconnecting:
      return "Reconnecting...";
    case ShowConnectionStatus.Failed:
      return "Sync failed";
    case ShowConnectionStatus.Disconnected:
      return "Offline";
    default:
      return "Offline";
  }
}

const labelClass = css({ ml: "1" });
</script>

<template>
  <Tooltip :content="connectionLabel">
    <!-- Display-only indicator: aria-disabled instead of `disabled` so the
         button keeps firing pointer events and the tooltip stays usable. -->
    <button
      type="button"
      :class="cx(button({ variant: 'ghost' }), css({ cursor: 'default', _hover: { bg: 'transparent' } }))"
      aria-disabled="true"
    >
      <Wifi v-if="realtimeStore.connectionStatus === ShowConnectionStatus.Connected" :size="16" aria-hidden />
      <RefreshCw
        v-else-if="
          realtimeStore.connectionStatus === ShowConnectionStatus.Connecting ||
          realtimeStore.connectionStatus === ShowConnectionStatus.Reconnecting
        "
        :size="16"
        aria-hidden
      />
      <AlertTriangle
        v-else-if="realtimeStore.connectionStatus === ShowConnectionStatus.Failed"
        :size="16"
        aria-hidden
      />
      <WifiOff v-else :size="16" aria-hidden />
      <span :class="labelClass">{{ connectionLabel }}</span>
    </button>
  </Tooltip>
</template>
