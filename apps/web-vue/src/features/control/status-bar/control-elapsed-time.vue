<script setup lang="ts">
import { computed } from "vue";

import { useControlNowStore } from "@/features/control/control-now-store";
import { usePlaybackStore } from "@/features/control/playback-store";

const controlNowStore = useControlNowStore();
const playbackStore = usePlaybackStore();

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.max(0, Math.floor(totalSeconds / 3600));
  const minutes = Math.max(0, Math.floor((totalSeconds % 3600) / 60));
  const seconds = Math.max(0, totalSeconds % 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const isStarted = computed(() => playbackStore.state.startedAt != null);
const elapsedText = computed(() => {
  const startedAt = playbackStore.state.startedAt;
  const elapsedMs = startedAt != null ? controlNowStore.now - startedAt : 0;
  return startedAt != null ? formatElapsed(elapsedMs) : "--:--:--";
});
</script>

<template>
  <span class="tgb-clock-elapsed" :class="{ 'tgb-clock-elapsed--idle': !isStarted }">
    T+{{ elapsedText }}
  </span>
</template>

<style scoped>
.tgb-clock-elapsed {
  font-family: var(--fonts-mono);
  font-variant-numeric: tabular-nums;
  font-size: 1.875rem;
  line-height: 1.1;
}

.tgb-clock-elapsed--idle {
  opacity: 0.5;
}
</style>