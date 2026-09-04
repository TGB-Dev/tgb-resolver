<script setup lang="ts">
import { css } from "@styled-system/css";
import { type AnimationPlaybackControls, animate } from "motion";
import { computed, onMounted, onUnmounted, useTemplateRef, watch, watchEffect } from "vue";

import { usePlaybackStore } from "@/features/control/playback-store";
import { useColorModeStore } from "@/stores/color-mode-store";

const props = defineProps<{
  eventId: number;
  durationInSeconds?: number;
}>();

const playback = usePlaybackStore();
const colorModeStore = useColorModeStore();
const bar = useTemplateRef<HTMLElement>("bar");
const warning = useTemplateRef<HTMLElement>("warning");
const root = useTemplateRef<HTMLElement>("root");
let controls: AnimationPlaybackControls[] = [];

const active = computed(
  () =>
    playback.currentEventId === props.eventId ||
    playback.state.activeEventIds.includes(props.eventId),
);

// Active rows read inverted in light mode (matches the React reference).
// Applied imperatively to the parent row so only this leaf re-renders.
watchEffect(() => {
  const rowEl = root.value?.closest<HTMLElement>("[data-event-id]");
  if (!rowEl) return;
  const activeInLightMode = active.value && colorModeStore.colorMode === "light";
  rowEl.style.color = activeInLightMode ? "var(--colors-fg-inverted)" : "";
});

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
  <div ref="root" :class="css({ position: 'absolute', inset: 0, pointerEvents: 'none' })">
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
      :class="css({
        position: 'absolute',
        inset: 0,
        borderWidth: 2,
        borderColor: 'border.success',
        // Drives the shared borderColorPulse keyframe (see panda/keyframes.ts).
        '--pulse-from': '{colors.border.success}',
        '--pulse-to': '{colors.border}',
        animation: 'borderPulse',
        zIndex: 1,
      })"
    />
  </div>
</template>
