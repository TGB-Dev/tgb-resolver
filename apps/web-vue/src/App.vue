<script setup lang="ts">
import { css } from "@styled-system/css";
import { HotkeysProvider } from "@tanstack/vue-hotkeys";
import { type ComponentPublicInstance, onErrorCaptured, onMounted, ref } from "vue";

import BigRefetchOverlay from "@/features/control/big-refetch-overlay.vue";
import { useRealtimeConnection } from "@/features/control/composables/use-realtime-connection";
import AppDevtools from "@/features/shared/app/app-devtools.vue";
import ErrorPage from "@/features/shared/app/error-page.vue";
import { hotkeysDefaultOptions } from "@/features/shared/app/providers";
import Toaster from "@/features/shared/ui/toaster.vue";
import { useColorModeStore } from "@/stores/color-mode-store";

useColorModeStore(); // applies initial theme class (FOUC-safe, matches index.html bootstrap)

const renderError = ref<Error | null>(null);

onErrorCaptured((err: unknown, _instance: ComponentPublicInstance | null, _info: string) => {
  renderError.value = err instanceof Error ? err : new Error(String(err));
  return false;
});

onMounted(() => {
  useRealtimeConnection();
});
</script>

<template>
  <HotkeysProvider :defaultOptions="hotkeysDefaultOptions">
    <div :class="css({ minH: '100vh', w: 'full', px: 0 })">
      <ErrorPage v-if="renderError" :error="renderError" />
      <RouterView v-else />
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
