<script setup lang="ts">
import { ChevronLeft, ChevronRight, Pause, Play, TimerReset } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { button, iconButton } from "@styled-system/recipes";
import { PlaybackStatus } from "@tgb-resolver/contracts";
import { computed } from "vue";

import {
  useControlCanMutate,
  useControlShowRows,
  useResetPlaybackMutation,
  useSeekPlaybackMutation,
  useStartPlaybackMutation,
} from "@/features/control/composables/use-show";
import { usePlaybackStore } from "@/features/control/playback-store";
import { useAction } from "@/lib/actions";

const startPlayback = useStartPlaybackMutation();
const resetPlayback = useResetPlaybackMutation();
const seekPlayback = useSeekPlaybackMutation();
const playbackStore = usePlaybackStore();
const canMutate = useControlCanMutate();

const playbackStatus = computed(() => playbackStore.status);
const rows = useControlShowRows();
const currentEventId = computed(() => playbackStore.currentEventId);
const currentIndex = computed(() => {
  const id = currentEventId.value;
  return id != null ? rows.value.findIndex((row) => row.id === id) : -1;
});
const canSeek = computed(
  () =>
    playbackStatus.value === PlaybackStatus.RUNNING ||
    playbackStatus.value === PlaybackStatus.PAUSED,
);

const enablePrev = computed(
  () => canMutate.value && canSeek.value && currentIndex.value > 0 && !seekPlayback.isPending.value,
);
const enableNext = computed(
  () =>
    canMutate.value &&
    canSeek.value &&
    currentIndex.value >= 0 &&
    currentIndex.value < rows.value.length - 1 &&
    !seekPlayback.isPending.value,
);

const prevAction = useAction({
  handler: () => {
    if (currentIndex.value > 0) {
      const prev = rows.value[currentIndex.value - 1];
      if (prev) seekPlayback.mutate(prev.id);
    }
  },
  enabled: enablePrev,
  hotkeys: ["ArrowLeft"],
});

const nextAction = useAction({
  handler: () => {
    if (currentIndex.value >= 0 && currentIndex.value < rows.value.length - 1) {
      const next = rows.value[currentIndex.value + 1];
      if (next) seekPlayback.mutate(next.id);
    }
  },
  enabled: enableNext,
  hotkeys: ["ArrowRight", "Space"],
});

const iconButtonClass = cx(button(), iconButton());
</script>

<template>
  <button
    type="button"
    aria-label="Play or Pause"
    :class="iconButtonClass"
    :disabled="!canMutate || startPlayback.isPending.value"
    @click="startPlayback.mutate()"
  >
    <Pause v-if="playbackStatus === PlaybackStatus.RUNNING" :size="16" aria-hidden />
    <Play v-else :size="16" aria-hidden />
  </button>
  <button
    type="button"
    aria-label="Reset playback"
    :class="iconButtonClass"
    :disabled="!canMutate || resetPlayback.isPending.value"
    @click="resetPlayback.mutate()"
  >
    <TimerReset :size="16" aria-hidden />
  </button>

  <button
    type="button"
    aria-label="Previous event"
    :class="iconButtonClass"
    :disabled="!enablePrev"
    @click="prevAction.execute()"
  >
    <ChevronLeft :size="16" aria-hidden />
  </button>
  <button
    type="button"
    aria-label="Next event"
    :class="iconButtonClass"
    :disabled="!enableNext"
    @click="nextAction.execute()"
  >
    <ChevronRight :size="16" aria-hidden />
  </button>

  <div :class="[css({ h: '6' }), css({ mx: 1 })]" aria-hidden />
</template>
