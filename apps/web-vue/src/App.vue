<script setup lang="ts">
import { Box } from "@styled-system/jsx";

import { useColorModeStore } from "@/stores/color-mode-store";

useColorModeStore(); // applies initial theme class (FOUC-safe, matches index.html bootstrap)
</script>

<template>
  <Box minH="dvh" w="full" px="0">
    <RouterView />
  </Box>
</template>

<style scoped>
:global(html.dark) {
  color-scheme: dark;
}
</style>