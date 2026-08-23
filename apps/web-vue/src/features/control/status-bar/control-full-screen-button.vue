<script setup lang="ts">
import { Fullscreen, Minimize } from "@lucide/vue";
import { cx } from "@styled-system/css";
import { button, iconButton } from "@styled-system/recipes";
import { useFullscreen } from "@vueuse/core";

const documentEl = document.documentElement;
const {isFullscreen, toggle: toggleFullscreen} = useFullscreen(documentEl);
</script>

<template>
  <button
    type="button"
    :aria-label="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
    :class="cx(button({ variant: 'ghost' }), iconButton())"
    @click="toggleFullscreen"
  >
    <Minimize v-if="isFullscreen" :size="10" aria-hidden />
    <Fullscreen v-else :size="10" aria-hidden />
  </button>
</template>
