<script setup lang="ts">
import { computed } from "vue";

import { useControlNowStore } from "@/features/control/control-now-store";

const controlNowStore = useControlNowStore();

function formatHms(date: Date): string {
  return date.toLocaleTimeString("en-GB", { hour12: false });
}

const formatted = computed(() => formatHms(new Date(controlNowStore.now)));
</script>

<template>
  <span class="tgb-clock-now">{{ formatted }}</span>
</template>

<style scoped>
.tgb-clock-now {
  font-family: var(--fonts-mono);
  font-variant-numeric: tabular-nums;
  font-size: 0.875rem;
}
</style>