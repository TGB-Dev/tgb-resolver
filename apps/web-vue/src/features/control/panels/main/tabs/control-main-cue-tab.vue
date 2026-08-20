<script setup lang="ts">
import { css } from "@styled-system/css";
import { VStack } from "@styled-system/jsx";
import { computed } from "vue";

import { useControlShowRows } from "@/features/control/composables/use-show";
import { usePlaybackStore } from "@/features/control/playback-store";

import { CUE_CONFIG, Cue } from "./cue";
import CueContent from "./cue-content.vue";
import CueItem from "./cue-item.vue";
import NextCueTimer from "./next-cue-timer.vue";

defineOptions({ name: "ControlMainCueTab" });

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
</script>

<template>
  <div :class="css({ display: 'grid', h: 'full', gridTemplateRows: '1fr auto 1fr 1fr', p: '4' })">
    <!-- If no current cue -->
    <template v-if="currentIndex < 0">
      <CueItem :cue="Cue.CURRENT">
        <CueContent :cue="undefined" :contentSize="CUE_CONFIG[Cue.CURRENT].contentSize" />
      </CueItem>
      <NextCueTimer />
      <CueItem :cue="Cue.NEXT">
        <CueContent :cue="undefined" :contentSize="CUE_CONFIG[Cue.NEXT].contentSize" />
      </CueItem>
      <CueItem :cue="Cue.PREVIOUS">
        <CueContent :cue="undefined" :contentSize="CUE_CONFIG[Cue.PREVIOUS].contentSize" />
      </CueItem>
    </template>

    <!-- With current cue -->
    <template v-else>
      <CueItem :cue="Cue.CURRENT">
        <VStack gap="2" alignItems="start">
          <CueContent :cue="parentCue" :contentSize="CUE_CONFIG[Cue.CURRENT].contentSize" />
          <CueContent
            v-if="latestChild"
            :cue="latestChild"
            :contentSize="CUE_CONFIG[Cue.CURRENT].contentSize"
          />
        </VStack>
      </CueItem>
      <NextCueTimer />
      <CueItem :cue="Cue.NEXT">
        <CueContent :cue="nextCue" :contentSize="CUE_CONFIG[Cue.NEXT].contentSize" />
      </CueItem>
      <CueItem :cue="Cue.PREVIOUS">
        <CueContent :cue="previousCue" :contentSize="CUE_CONFIG[Cue.PREVIOUS].contentSize" />
      </CueItem>
    </template>
  </div>
</template>
