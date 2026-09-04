<script setup lang="ts">
import { css } from "@styled-system/css";

import Leaderboard from "@/features/leaderboard/leaderboard.vue";
import { useBackgroundMusic } from "@/lib/sound-engine/use-background-music";

useBackgroundMusic(() => true);
</script>

<template>
  <div :class="css({ position: 'relative', h: '100vh', overflow: 'hidden' })">
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
          zIndex: 9999,
        })
      "
    />
  </div>
</template>
