<script setup lang="ts">
import { Box } from "@styled-system/jsx";
import { computed } from "vue";

import { useControlIsLive } from "@/features/control/composables/use-show";
import { extensionRegistry } from "@/features/extensions/registry";
import GridTableRow from "@/features/shared/ui/grid-table-row.vue";
import Tooltip from "@/features/shared/ui/tooltip.vue";

import {
  timelineTableGridTemplateColumns,
  timelineTableGridTemplateColumnsStatic,
} from "./timeline-table-column-config";

const props = defineProps<{
  isLive?: boolean;
}>();

const controlIsLive = useControlIsLive();
const isLiveEffective = computed(() => props.isLive ?? controlIsLive.value);
const templateColumns = computed(() =>
  isLiveEffective.value
    ? timelineTableGridTemplateColumnsStatic
    : timelineTableGridTemplateColumns,
);
</script>

<template>
  <GridTableRow
    :templateColumns="templateColumns"
    h="auto"
    bg="bg.subtle"
    py="2"
  >
    <Tooltip content="Event ID" :openDelay="0">
      <Box textAlign="end">No.</Box>
    </Tooltip>

    <Tooltip :openDelay="0">
      <template #content>
        <Box display="flex" flexDirection="column" gap="1" fontSize="xs">
          <Box><Box as="span" fontWeight="bold">RES</Box>: Contestant Resolve</Box>
          <Box><Box as="span" fontWeight="bold">PRE</Box>: Pre-Resolve (preview upcoming resolve)</Box>
          <Box><Box as="span" fontWeight="bold">UNK</Box>: Unknown</Box>
          <Box v-for="ext in extensionRegistry.extensionList" :key="ext.extId">
            <Box as="span" fontWeight="bold">{{ ext.shortName }}</Box>: {{ ext.description }}
          </Box>
        </Box>
      </template>
      <Box>Type</Box>
    </Tooltip>

    <Tooltip content="Name for this event. Double-click to customize." :openDelay="0">
      <Box>Name</Box>
    </Tooltip>

    <Tooltip content="Problem name and score for this resolve event." :openDelay="0">
      <Box>Prob.</Box>
    </Tooltip>

    <Tooltip content="New total team score after this resolve event." :openDelay="0">
      <Box textAlign="end">NScore</Box>
    </Tooltip>

    <Tooltip content="New rank after this resolve event." :openDelay="0">
      <Box textAlign="end">NRank</Box>
    </Tooltip>

    <Tooltip content="Duration in seconds. Cannot be negative." :openDelay="0">
      <Box textAlign="end">Dur.</Box>
    </Tooltip>

    <Tooltip
      content="Trigger offset from the start of previous event in seconds. Can be negative."
      :openDelay="0"
    >
      <Box textAlign="end">Trig. Off.</Box>
    </Tooltip>

    <Tooltip content="Whether this event requires manual interaction to proceed." :openDelay="0">
      <Box>Man.?</Box>
    </Tooltip>

    <Box v-if="!isLiveEffective" />
  </GridTableRow>
</template>
