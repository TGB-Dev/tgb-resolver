<script setup lang="ts">
import { Box } from "@styled-system/jsx";
import { computed } from "vue";

import type { FloatingPanelHandle } from "@/features/control/floating-panel-types";
import { useShowStore } from "@/stores/show-store";

defineOptions({ name: "InspectShowPanel" });

defineProps<{
  panel?: FloatingPanelHandle;
}>();

const showStore = useShowStore();
const file = computed(() => showStore.showFile);
</script>

<template>
  <Box h="full" overflow="auto" p="4">
    <Box v-if="!file" color="fg.muted">
      No show loaded.
    </Box>
    <Box
      v-else
      as="pre"
      fontFamily="mono"
      fontSize="xs"
      whiteSpace="pre-wrap"
      p="2"
      bg="bg.muted"
      rounded="md"
    >
      {{ JSON.stringify(file, null, 2) }}
    </Box>
  </Box>
</template>
