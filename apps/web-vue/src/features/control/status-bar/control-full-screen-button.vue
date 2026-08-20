<script setup lang="ts">
import { Fullscreen, Minimize } from "@lucide/vue";

import IconButton from "@/features/shared/ui/icon-button.vue";
import { useFullscreenStore } from "@/stores/fullscreen-store";

const fullscreenStore = useFullscreenStore();
</script>

<template>
  <IconButton :ariaLabel="fullscreenStore.isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'" @click="fullscreenStore.toggleFullscreen">
    <Minimize v-if="fullscreenStore.isFullscreen" :size="10" aria-hidden />
    <Fullscreen v-else :size="10" aria-hidden />
  </IconButton>
</template>
