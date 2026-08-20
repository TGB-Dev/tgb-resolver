<script setup lang="ts">
import { Box } from "@styled-system/jsx";
import { HotkeysProvider } from "@tanstack/vue-hotkeys";

import AppDevtools from "@/features/shared/app/app-devtools.vue";
import { hotkeysDefaultOptions } from "@/features/shared/app/providers";
import Toaster from "@/features/shared/ui/toaster.vue";
import { useColorModeStore } from "@/stores/color-mode-store";

useColorModeStore(); // applies initial theme class (FOUC-safe, matches index.html bootstrap)
</script>

<template>
  <HotkeysProvider :defaultOptions="hotkeysDefaultOptions">
    <Box minH="dvh" w="full" px="0">
      <RouterView />
      <Toaster />
      <AppDevtools />
    </Box>
  </HotkeysProvider>
</template>

<style scoped>
:global(html.dark) {
  color-scheme: dark;
}
</style>