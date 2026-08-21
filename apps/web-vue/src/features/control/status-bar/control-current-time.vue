<script setup lang="ts">
import { css } from "@styled-system/css";
import { computed } from "vue";

import { useControlNowStore } from "@/features/control/control-now-store";

const controlNowStore = useControlNowStore();

const root = css({
  fontFamily: "mono",
  fontVariantNumeric: "tabular-nums",
  fontSize: "sm",
  mx: 2
});

function formatHms(date: Date): string {
  return date.toLocaleTimeString("en-GB", { hour12: false });
}

const formatted = computed(() => formatHms(new Date(controlNowStore.now)));
</script>

<template>
  <span :class="root">{{ formatted }}</span>
</template>
