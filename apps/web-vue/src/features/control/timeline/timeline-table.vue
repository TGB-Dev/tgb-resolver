<script setup lang="ts">
import { Center, VStack } from "@styled-system/jsx";

import { useControlShowQuery } from "@/features/control/composables/use-show";
import { useShowStore } from "@/stores/show-store";

import TimelineTableHeader from "./timeline-table-header.vue";
import TimelineTableItem from "./timeline-table-item.vue";

defineOptions({ name: "ControlTimelineTable" });
const showQuery = useControlShowQuery();
const showStore = useShowStore();
</script>

<template>
  <Center h="full" px="4" overflow="auto" class="tgb-timeline-stub">
    <VStack w="full" alignItems="stretch">
      <TimelineTableHeader />
      <TimelineTableItem v-for="row in showStore.rows" :key="row.id" :payload="row" />
      <p v-if="showQuery.isLoading.value || showStore.rows.length === 0" class="tgb-timeline-stub-sub">{{ showQuery.isLoading.value ? "Loading timeline…" : "No timeline events" }}</p>
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
