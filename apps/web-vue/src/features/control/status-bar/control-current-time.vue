<script setup lang="ts">
import { computed } from "vue";

import { useControlNowStore } from "@/features/control/control-now-store";
import MonoText from "@/features/shared/ui/mono-text.vue";

const controlNowStore = useControlNowStore();

function formatHms(date: Date): string {
  return date.toLocaleTimeString("en-GB", { hour12: false });
}

const formatted = computed(() => formatHms(new Date(controlNowStore.now)));
</script>

<template>
  <MonoText>{{ formatted }}</MonoText>
</template>
