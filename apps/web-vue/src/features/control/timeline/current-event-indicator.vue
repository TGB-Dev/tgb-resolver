<script setup lang="ts">
import { css } from "@styled-system/css";
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

watch(active, run, { flush: "post" });
watch(() => props.durationInSeconds, run, { flush: "post" });
onMounted(run);
onUnmounted(stop);
</script>

<template>
  <div :class="css({ position: 'absolute', inset: 0, pointerEvents: 'none' })">
    <div
      v-if="active"
      ref="bar"
      :class="css({ position: 'absolute', inset: 0, transform: 'scaleX(0)', transformOrigin: 'left', bg: 'green.600', zIndex: 0 })"
    >
      <div
        ref="warning"
        :class="css({ position: 'absolute', inset: 0, bg: 'red.500', opacity: 0 })"
      />
    </div>
    <div
      v-if="active"
      :class="css({ position: 'absolute', inset: 0, borderWidth: 2, borderColor: 'border.success', animation: 'borderPulse', zIndex: 1 })"
    />
  </div>
</template>
