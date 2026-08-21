<script setup lang="ts">
import { css } from "@styled-system/css";

import Leaderboard from "@/features/leaderboard/leaderboard.vue";
</script>

<template>
  <div :class="css({ position: 'relative', height: '100vh', overflow: 'hidden' })">
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
          zIndex: '9999',
        })
      "
    />
  </div>
</template>
