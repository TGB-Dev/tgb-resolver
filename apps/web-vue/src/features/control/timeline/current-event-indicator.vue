<script setup lang="ts">
import { Box } from "@styled-system/jsx";
import { type AnimationPlaybackControls, animate } from "motion";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import { usePlaybackStore } from "@/features/control/playback-store";

const props = defineProps<{
  eventId: number;
  durationInSeconds?: number;
}>();

const playback = usePlaybackStore();
const bar = ref<HTMLElement>();
const warning = ref<HTMLElement>();
let controls: AnimationPlaybackControls[] = [];

const active = computed(
  () =>
    playback.currentEventId === props.eventId ||
    playback.state.activeEventIds.includes(props.eventId),
);

function stop() {
  controls.forEach((control) => {
    control.stop();
  });
  controls = [];
}

function run() {
  stop();
  if (!active.value || !bar.value || !warning.value) return;
  const duration = props.durationInSeconds ?? 0;
  controls = [
    animate(bar.value, { scaleX: [0, 1] }, { duration, ease: "linear" }),
    animate(warning.value, { opacity: [0, 0, 1] }, { duration, ease: "linear" }),
  ];
}

watch(active, run);
watch(() => props.durationInSeconds, run);
onMounted(run);
onUnmounted(stop);
</script>

<template>
  <Box position="absolute" inset="0" pointerEvents="none">
    <Box
      v-if="active"
      ref="bar"
      position="absolute"
      inset="0"
      transform="scaleX(0)"
      transformOrigin="left"
      bg="green.600"
    >
      <Box
        ref="warning"
        position="absolute"
        inset="0"
        bg="red.500"
        opacity="0"
      />
    </Box>
    <Box
      v-if="active"
      position="absolute"
      inset="0"
      borderWidth="2"
      borderColor="border.success"
      animation="pulse"
    />
  </Box>
</template>
