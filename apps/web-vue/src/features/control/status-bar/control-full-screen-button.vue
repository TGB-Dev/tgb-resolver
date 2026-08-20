<script setup lang="ts">
import { Fullscreen, Minimize } from "@lucide/vue";

import UiButton from "@/features/shared/ui/button.vue";
import { useFullscreenStore } from "@/stores/fullscreen-store";

const fullscreenStore = useFullscreenStore();
</script>

<template>
  <UiButton variant="ghost" aspect-ratio="1" :aria-label="fullscreenStore.isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'" @click="fullscreenStore.toggleFullscreen">
    <Minimize v-if="fullscreenStore.isFullscreen" :size="10" aria-hidden />
    <Fullscreen v-else :size="10" aria-hidden />
  </UiButton>
</template>
