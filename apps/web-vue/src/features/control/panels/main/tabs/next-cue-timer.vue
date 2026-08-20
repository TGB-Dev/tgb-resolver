<script setup lang="ts">
import { ChevronDown } from "@lucide/vue";
import { Box, HStack } from "@styled-system/jsx";
import { computed, ref, watch } from "vue";

import { useControlShowRows } from "@/features/control/composables/use-show";
import { useControlNowStore } from "@/features/control/control-now-store";
import { usePlaybackStore } from "@/features/control/playback-store";

defineOptions({ name: "NextCueTimer" });

const controlNowStore = useControlNowStore();
const playbackStore = usePlaybackStore();
const rows = useControlShowRows();

const currentEventId = computed(() => playbackStore.currentEventId);
const playingEvents = computed(() =>
  rows.value.filter(
    (row) => row.id === currentEventId.value && (row.durationSeconds ?? 0) > 0,
  ),
);

const playingKey = computed(() => playingEvents.value.map((r) => r.id).join(","));
const eventStartedAt = ref(controlNowStore.now);

watch(
  playingKey,
  (newKey, oldKey) => {
    if (newKey && newKey !== oldKey) {
      eventStartedAt.value = controlNowStore.now;
    }
  },
  { immediate: true },
);

function formatRemaining(ms: number) {
  const clamped = Math.max(0, ms);
  return {
    minutes: String(Math.floor(clamped / 60_000)).padStart(2, "0"),
    seconds: String(Math.floor((clamped % 60_000) / 1000)).padStart(2, "0"),
    hundredMillis: String(Math.floor(Math.floor(clamped % 1000) / 100)),
  };
}

const remainingMs = computed(() => {
  const elapsed = controlNowStore.now - eventStartedAt.value;
  return playingEvents.value.reduce(
    (sum, d) => sum + Math.max(0, (d.durationSeconds ?? 0) * 1000 - elapsed),
    0,
  );
});

const formatted = computed(() => formatRemaining(remainingMs.value));
</script>

<template>
  <HStack v-if="playingEvents.length === 0" gap="2" alignItems="center" py="4" fontSize="lg" fontFamily="mono">
    <ChevronDown :size="20" aria-hidden />
    <Box as="span" color="fg.muted" fontVariantNumeric="tabular-nums">
      No active cue
    </Box>
  </HStack>

  <HStack v-else gap="2" alignItems="center" py="4" fontSize="lg" fontFamily="mono">
    <ChevronDown :size="20" aria-hidden />
    <span>Next cue in </span>
    <Box as="span" fontFamily="mono" fontVariantNumeric="tabular-nums" fontWeight="bold">
      {{ formatted.minutes }}:{{ formatted.seconds }}.
      <Box as="span" fontSize="sm">{{ formatted.hundredMillis }}</Box>
    </Box>
  </HStack>
</template>
