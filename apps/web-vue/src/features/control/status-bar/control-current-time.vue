<script setup lang="ts">
import { computed } from "vue";

import { useControlNowStore } from "@/features/control/control-now-store";
import { monoTextCss } from "@/features/shared/ui/mono-text";

const controlNowStore = useControlNowStore();

function formatHms(date: Date): string {
  return date.toLocaleTimeString("en-GB", { hour12: false });
}

const formatted = computed(() => formatHms(new Date(controlNowStore.now)));
</script>

<template>
  <span :class="monoTextCss">{{ formatted }}</span>
</template>
