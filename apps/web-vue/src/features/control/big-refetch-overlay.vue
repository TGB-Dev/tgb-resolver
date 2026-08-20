<script setup lang="ts">
import { Box, VStack } from "@styled-system/jsx";

import { useRealtimeStore } from "@/stores/realtime-store";

const realtimeStore = useRealtimeStore();
</script>

<template>
  <Box
    v-if="realtimeStore.bigRefetching"
    class="tgb-big-refetch"
    alignItems="center"
    display="flex"
    inset="0"
    justifyContent="center"
    position="fixed"
    zIndex="toast"
  >
    <VStack gap="4">
      <span class="tgb-big-refetch-spinner" aria-hidden />
      <p class="tgb-big-refetch-text">Syncing show…</p>
    </VStack>
  </Box>
</template>

<style scoped>
.tgb-big-refetch {
  background: rgb(0 0 0 / 0.7);
}

.tgb-big-refetch-spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid var(--colors-border-muted);
  border-top-color: var(--colors-fg-muted);
  border-radius: 9999px;
  animation: tgb-big-refetch-spin 0.9s linear infinite;
}

.tgb-big-refetch-text {
  color: var(--colors-fg-muted);
  font-size: 0.875rem;
}

@keyframes tgb-big-refetch-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>