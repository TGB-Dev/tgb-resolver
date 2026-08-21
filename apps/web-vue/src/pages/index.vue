<script setup lang="ts">
import { css } from "@styled-system/css";
import { useHotkey } from "@tanstack/vue-hotkeys";
import { useFullscreen } from "@vueuse/core";

import Leaderboard from "@/features/leaderboard/leaderboard.vue";
import { useBackgroundMusic } from "@/lib/sound-engine/use-background-music";

const { toggle: toggleFullscreen } = useFullscreen(document.documentElement);
useHotkey("F", () => void toggleFullscreen());
useBackgroundMusic(() => true);
</script>

<template>
  <div :class="css({ position: 'relative', h: '100vh', overflow: 'hidden' })" data-audience-scroll>
    <Leaderboard isBigScreen />
    <!-- Overlay to prevent manual interaction to the resolve leaderboard by absorbing all events -->
    <div
      :class="
        css({
          position: 'absolute',
          top: 0,
          left: 0,
          w: 'full',
          h: 'full',
          overflow: 'hidden',
          pointerEvents: 'auto',
          zIndex: 'overlay',
        })
      "
    />
  </div>
</template>
