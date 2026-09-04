<script setup lang="ts">
import { css, cx } from "@styled-system/css";
import { dataList, gridTableRow } from "@styled-system/recipes";
import { computed } from "vue";

import { useControlIsLive } from "@/features/control/composables/use-show";
import { extensionRegistry } from "@/features/extensions/registry";
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

const typeTooltipItems = computed(() => [
  { label: "RES", value: "Contestant Resolve" },
  { label: "PRE", value: "Pre-Resolve (preview upcoming resolve)" },
  { label: "UNK", value: "Unknown" },
  ...extensionRegistry.extensionList.map((ext) => ({
    label: ext.shortName,
    value: ext.description,
  })),
]);

const rowClasses = cx(gridTableRow(), css({ bg: "bg.subtle", py: "2" }));
const listClasses = dataList();
</script>

<template>
  <div :class="rowClasses" :style="{ gridTemplateColumns: templateColumns }">
    <Tooltip content="Event ID" :openDelay="0">
      <div :class="css({ textAlign: 'end' })">No.</div>
    </Tooltip>

    <Tooltip :openDelay="0">
      <template #content>
        <dl :class="listClasses.root">
          <div v-for="(item, index) in typeTooltipItems" :key="index" :class="listClasses.item">
            <dt :class="listClasses.itemLabel">{{ item.label }}</dt>
            <dd :class="listClasses.itemValue">{{ item.value }}</dd>
          </div>
        </dl>
      </template>
      <div>Type</div>
    </Tooltip>

    <Tooltip content="Name for this event. Double-click to customize." :openDelay="0">
      <div>Name</div>
    </Tooltip>

    <Tooltip content="Problem name and score for this resolve event." :openDelay="0">
      <div>Prob.</div>
    </Tooltip>

    <Tooltip content="New total team score after this resolve event." :openDelay="0">
      <div :class="css({ textAlign: 'end' })">NScore</div>
    </Tooltip>

    <Tooltip content="New rank after this resolve event." :openDelay="0">
      <div :class="css({ textAlign: 'end' })">NRank</div>
    </Tooltip>

    <Tooltip content="Duration in seconds. Cannot be negative." :openDelay="0">
      <div :class="css({ textAlign: 'end' })">Dur.</div>
    </Tooltip>

    <Tooltip
      content="Trigger offset from the start of previous event in seconds. Can be negative."
      :openDelay="0"
    >
      <div :class="css({ textAlign: 'end' })">Trig. Off.</div>
    </Tooltip>

    <Tooltip content="Whether this event requires manual interaction to proceed." :openDelay="0">
      <div>Man.?</div>
    </Tooltip>

    <div v-if="!isLiveEffective" />
  </div>
</template>
