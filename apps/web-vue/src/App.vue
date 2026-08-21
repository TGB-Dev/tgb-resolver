<script setup lang="ts">
import { css } from "@styled-system/css";
import { HotkeysProvider } from "@tanstack/vue-hotkeys";
import { onMounted } from "vue";

import BigRefetchOverlay from "@/features/control/big-refetch-overlay.vue";
import { useRealtimeConnection } from "@/features/control/composables/use-realtime-connection";
import AppDevtools from "@/features/shared/app/app-devtools.vue";
import { hotkeysDefaultOptions } from "@/features/shared/app/providers";
import Toaster from "@/features/shared/ui/toaster.vue";
import { useColorModeStore } from "@/stores/color-mode-store";

useColorModeStore(); // applies initial theme class (FOUC-safe, matches index.html bootstrap)

onMounted(() => {
  useRealtimeConnection();
});
</script>

<template>
  <HotkeysProvider :defaultOptions="hotkeysDefaultOptions">
    <div :class="css({ minHeight: '100vh', w: 'full', px: 0 })">
      <RouterView />
      <Toaster />
      <AppDevtools />
      <BigRefetchOverlay />
    </div>
  </HotkeysProvider>
</template>

<style scoped>
:global(html.dark) {
  color-scheme: dark;
}
</style>
