<script setup lang="ts">
import { css, cx } from "@styled-system/css";
import { computed } from "vue";

import { useControlNowStore } from "@/features/control/control-now-store";
import { usePlaybackStore } from "@/features/control/playback-store";
import { monoTextCss } from "@/features/shared/ui/mono-text";

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
const timeClass = css({
  fontSize: "3xl",
  opacity: 0.5,
  '&[data-started="true"]': { opacity: 1 },
});
const elapsedText = computed(() => {
  const startedAt = playbackStore.state.startedAt;
  const elapsedMs = startedAt != null ? controlNowStore.now - startedAt : 0;
  return startedAt != null ? formatElapsed(elapsedMs) : "--:--:--";
});
</script>

<template>
  <span :data-started="isStarted" :class="cx(monoTextCss, timeClass)">
    T+{{ elapsedText }}
  </span>
</template>
