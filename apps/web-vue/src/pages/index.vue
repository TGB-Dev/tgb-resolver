<script setup lang="ts">
import { Box } from "@styled-system/jsx";

import ControlRealtimeProvider from "@/features/control/realtime-provider.vue";
import Leaderboard from "@/features/leaderboard/leaderboard.vue";
</script>

<template>
  <ControlRealtimeProvider>
    <Box position="relative">
      <Leaderboard isBigScreen />
      <!-- Overlay to prevent manual interaction to the resolve leaderboard by absorbing all events -->
      <Box
        position="absolute"
        top="0"
        left="0"
        w="full"
        h="full"
        overflow="hidden"
        pointerEvents="auto"
        zIndex="9999"
      />
    </Box>
  </ControlRealtimeProvider>
</template>
