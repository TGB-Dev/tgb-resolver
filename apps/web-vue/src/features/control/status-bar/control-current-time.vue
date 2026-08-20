<script setup lang="ts">
import { Box } from "@styled-system/jsx";
import { computed } from "vue";

import { useControlNowStore } from "@/features/control/control-now-store";

const controlNowStore = useControlNowStore();

function formatHms(date: Date): string {
  return date.toLocaleTimeString("en-GB", { hour12: false });
}

const formatted = computed(() => formatHms(new Date(controlNowStore.now)));
</script>

<template>
  <Box fontFamily="mono" fontVariantNumeric="tabular-nums" fontSize="sm">{{ formatted }}</Box>
</template>
