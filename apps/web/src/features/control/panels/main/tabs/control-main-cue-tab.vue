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

const container = css({
  display: "grid",
  gridTemplateRows: "1fr auto repeat(2, 1fr)",
  boxSize: "full",
  padding: "4",
});
const concurrentStack = css({ display: "flex", flexDirection: "column", gap: "2", alignItems: "start" });
</script>

<template>
  <div :class="container">
    <!-- Current -->
    <CueItem :cue="Cue.CURRENT">
      <div v-if="currentIndex >= 0" :class="concurrentStack">
        <CueContent :cue="parentCue" :content-size="CUE_CONFIG[Cue.CURRENT].contentSize" />
        <CueContent
          v-if="latestChild"
          :cue="latestChild"
          :content-size="CUE_CONFIG[Cue.CURRENT].contentSize"
        />
      </div>
      <CueContent v-else :cue="undefined" :content-size="CUE_CONFIG[Cue.CURRENT].contentSize" />
    </CueItem>

    <!-- Next cue timer -->
    <NextCueTimer />

    <!-- Next -->
    <CueItem :cue="Cue.NEXT">
      <CueContent :cue="nextCue" :content-size="CUE_CONFIG[Cue.NEXT].contentSize" />
    </CueItem>

    <!-- Previous -->
    <CueItem :cue="Cue.PREVIOUS">
      <CueContent :cue="previousCue" :content-size="CUE_CONFIG[Cue.PREVIOUS].contentSize" />
    </CueItem>
  </div>
</template>
