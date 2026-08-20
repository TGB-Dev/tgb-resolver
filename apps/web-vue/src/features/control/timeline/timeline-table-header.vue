<script setup lang="ts">
import { Box } from "@styled-system/jsx";
import { computed } from "vue";

import { useControlIsLive } from "@/features/control/composables/use-show";
import GridTableRow from "@/features/shared/ui/grid-table-row.vue";

import {
  timelineTableGridTemplateColumns,
  timelineTableGridTemplateColumnsStatic,
} from "./timeline-table-column-config";

defineOptions({ name: "ControlTimelineTableHeader" });

const isLive = useControlIsLive();
const templateColumns = computed(() =>
  isLive.value
    ? timelineTableGridTemplateColumnsStatic
    : timelineTableGridTemplateColumns,
);
</script>

<template>
  <Box
    px="2"
    py="1"
    borderBottomWidth="1"
    borderColor="border"
    color="fg.muted"
    fontSize="xs"
    fontWeight="medium"
  >
    <GridTableRow :templateColumns="templateColumns">
      <Box textAlign="end">#</Box>
      <Box>Type</Box>
      <Box>Name</Box>
      <Box>Problem</Box>
      <Box textAlign="end">Score</Box>
      <Box textAlign="end">Rank</Box>
      <Box textAlign="end">Duration</Box>
      <Box textAlign="end">Offset</Box>
      <Box textAlign="center">Manual</Box>
      <Box v-if="!isLive" />
    </GridTableRow>
  </Box>
</template>
