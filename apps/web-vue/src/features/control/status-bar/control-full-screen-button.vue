<script setup lang="ts">
import { Fullscreen, Minimize } from "@lucide/vue";
import { useFullscreen } from "@vueuse/core";

import IconButton from "@/features/shared/ui/icon-button.vue";

const documentEl = document.documentElement;
const {isFullscreen, toggle: toggleFullscreen} = useFullscreen(documentEl);
</script>

<template>
  <IconButton :ariaLabel="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'" @click="toggleFullscreen" variant="ghost">
    <Minimize v-if="isFullscreen" :size="10" aria-hidden />
    <Fullscreen v-else :size="10" aria-hidden />
  </IconButton>
</template>
