<script setup lang="ts">
import { css } from "@styled-system/css";
import { computed } from "vue";

import { useControlShowRows } from "@/features/control/composables/use-show";
import { usePlaybackStore } from "@/features/control/playback-store";

import { CUE_CONFIG, Cue } from "./cue";
import CueContent from "./cue-content.vue";
import CueItem from "./cue-item.vue";
import NextCueTimer from "./next-cue-timer.vue";

const rows = useControlShowRows();
const playbackStore = usePlaybackStore();
const currentCueId = computed(() => playbackStore.currentCueId);
const currentIndex = computed(() =>
  rows.value.findIndex((row) => row.id === currentCueId.value),
);

// Hierarchy computations matching React reference
const parentIndex = computed(() => {
  let idx = currentIndex.value;
  if (idx < 0) return -1;
  while (idx > 0 && rows.value[idx]?.triggerOffsetSeconds != null) {
    idx--;
  }
  return idx;
});

const parentCue = computed(() =>
  parentIndex.value >= 0 ? rows.value[parentIndex.value] : undefined,
);

const concurrentChildren = computed(() => {
  if (parentIndex.value < 0 || currentIndex.value < 0) return [];
  return rows.value.slice(parentIndex.value + 1, currentIndex.value + 1);
});

const latestChild = computed(() =>
  concurrentChildren.value.length > 0
    ? concurrentChildren.value[concurrentChildren.value.length - 1]
    : undefined,
);

const nextGroupIndex = computed(() => {
  let idx = currentIndex.value + 1;
  while (idx < rows.value.length && rows.value[idx]?.triggerOffsetSeconds != null) {
    idx++;
  }
  return idx;
});

const nextCue = computed(() =>
  nextGroupIndex.value < rows.value.length ? rows.value[nextGroupIndex.value] : undefined,
);

const prevGroupIndex = computed(() => {
  let idx = parentIndex.value - 1;
  while (idx > 0 && rows.value[idx]?.triggerOffsetSeconds != null) {
    idx--;
  }
  return idx;
});

const previousCue = computed(() =>
  prevGroupIndex.value >= 0 && prevGroupIndex.value < parentIndex.value
    ? rows.value[prevGroupIndex.value]
    : undefined,
);

const containerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden',
  padding: '16px',
  gap: '16px',
});

const cueItemStyles = css({
  flex: '1 1 0',
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
});

const nextCueTimerStyles = css({
  flexShrink: 0,
});
</script>

<template>
  <div :class="containerStyles">
    <!-- If no current cue -->
    <template v-if="currentIndex < 0">
      <div :class="cueItemStyles">
        <CueItem :cue="Cue.CURRENT">
          <CueContent :cue="undefined" :contentSize="CUE_CONFIG[Cue.CURRENT].contentSize" />
        </CueItem>
      </div>
      <div :class="nextCueTimerStyles">
        <NextCueTimer />
      </div>
      <div :class="cueItemStyles">
        <CueItem :cue="Cue.NEXT">
          <CueContent :cue="undefined" :contentSize="CUE_CONFIG[Cue.NEXT].contentSize" />
        </CueItem>
      </div>
      <div :class="cueItemStyles">
        <CueItem :cue="Cue.PREVIOUS">
          <CueContent :cue="undefined" :contentSize="CUE_CONFIG[Cue.PREVIOUS].contentSize" />
        </CueItem>
      </div>
    </template>

    <!-- With current cue -->
    <template v-else>
      <div :class="cueItemStyles">
        <CueItem :cue="Cue.CURRENT">
          <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-start;">
            <CueContent :cue="parentCue" :contentSize="CUE_CONFIG[Cue.CURRENT].contentSize" />
            <CueContent
              v-if="latestChild"
              :cue="latestChild"
              :contentSize="CUE_CONFIG[Cue.CURRENT].contentSize"
            />
          </div>
        </CueItem>
      </div>
      <div :class="nextCueTimerStyles">
        <NextCueTimer />
      </div>
      <div :class="cueItemStyles">
        <CueItem :cue="Cue.NEXT">
          <CueContent :cue="nextCue" :contentSize="CUE_CONFIG[Cue.NEXT].contentSize" />
        </CueItem>
      </div>
      <div :class="cueItemStyles">
        <CueItem :cue="Cue.PREVIOUS">
          <CueContent :cue="previousCue" :contentSize="CUE_CONFIG[Cue.PREVIOUS].contentSize" />
        </CueItem>
      </div>
    </template>
  </div>
</template>
