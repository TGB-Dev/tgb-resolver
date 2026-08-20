<script setup lang="ts">
import { Center, VStack } from "@styled-system/jsx";

import { useControlShowQuery } from "@/features/control/composables/use-show";

defineOptions({ name: "ControlTimelineTable" });
const showQuery = useControlShowQuery();
</script>

<template>
  <Center h="full" px="4" overflow="auto" class="tgb-timeline-stub">
    <VStack gap="1">
      <p class="tgb-timeline-stub-title">Timeline</p>
      <p class="tgb-timeline-stub-sub">{{ showQuery.isLoading.value ? "Loading timeline…" : "No timeline events" }}</p>
    </VStack>
  </Center>
</template>

<style scoped>
.tgb-timeline-stub-title {
  font-size: 1.125rem;
  font-weight: 600;
}

.tgb-timeline-stub-sub {
  color: var(--colors-fg-muted);
  font-size: 0.875rem;
}
</style>
