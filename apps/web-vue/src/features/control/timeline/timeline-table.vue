<script setup lang="ts">
import { Box, Center, VStack } from "@styled-system/jsx";

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
      <Box v-if="showQuery.isLoading.value || showStore.rows.length === 0" color="fg.muted" fontSize="sm">{{ showQuery.isLoading.value ? "Loading timeline…" : "No timeline events" }}</Box>
    </VStack>
  </Center>
</template>
