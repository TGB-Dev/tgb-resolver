<script setup lang="ts">
import { Plus } from "@lucide/vue";
import { cx } from "@styled-system/css";
import { addBtnWrapper, button, iconButton } from "@styled-system/recipes";
import type { TimelineTableItem } from "@tgb-resolver/realtime";

import { useFloatingPanelStore } from "@/features/control/floating-panel-store";
import { FloatingPanelType } from "@/features/control/floating-panel-types";
import Tooltip from "@/features/shared/ui/tooltip.vue";
import { useShowStore } from "@/stores/show-store";

const props = defineProps<{
  payload: TimelineTableItem;
}>();

const floatingPanelStore = useFloatingPanelStore();
const showStore = useShowStore();

function getTimelinePosition(eventId: number, fallback: number) {
  const index = showStore.showOrderedIds.indexOf(eventId);
  return index < 0 ? fallback : index + 1;
}

function handleCreate(before: boolean) {
  const position = getTimelinePosition(props.payload.id, props.payload.position);
  floatingPanelStore.openFloatingPanel(
    FloatingPanelType.CreateEvent,
    `Create Event (${before ? "Before" : "After"} #${position})`,
    { relativeToEventId: props.payload.id, before },
  );
}
</script>

<template>
  <Tooltip content="Add event before" :open-delay="0">
    <button
      type="button"
      aria-label="Add event before"
      :class="cx(button({ variant: 'subtle', size: '2xs' }), iconButton(), addBtnWrapper({ position: 'before' }))"
      @click.stop="handleCreate(true)"
    >
      <Plus :size="12" aria-hidden />
    </button>
  </Tooltip>

  <Tooltip content="Add event after" :open-delay="0">
    <button
      type="button"
      aria-label="Add event after"
      :class="cx(button({ variant: 'subtle', size: '2xs' }), iconButton(), addBtnWrapper({ position: 'after' }))"
      @click.stop="handleCreate(false)"
    >
      <Plus :size="12" aria-hidden />
    </button>
  </Tooltip>
</template>
