<script setup lang="ts">
import { Box, VStack } from "@styled-system/jsx";

import UiSpinner from "@/features/shared/ui/spinner.vue";
import { useRealtimeStore } from "@/stores/realtime-store";

const realtimeStore = useRealtimeStore();
</script>

<template>
  <Box
    v-if="realtimeStore.bigRefetching"
    alignItems="center"
    display="flex"
    inset="0"
    justifyContent="center"
    position="fixed"
    zIndex="toast"
    bg="blackAlpha.700"
  >
    <VStack gap="4">
      <UiSpinner size="xl" label="" aria-hidden="true" />
      <Box as="p" color="fg.muted" fontSize="sm">Syncing show…</Box>
    </VStack>
  </Box>
</template>
