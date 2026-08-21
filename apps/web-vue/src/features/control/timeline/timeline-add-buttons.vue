<script setup lang="ts">
import { Plus } from "@lucide/vue";
import { css } from "@styled-system/css";
import type { TimelineTableItem } from "@tgb-resolver/realtime";

import { useFloatingPanelStore } from "@/features/control/floating-panel-store";
import { FloatingPanelType } from "@/features/control/floating-panel-types";
import IconButton from "@/features/shared/ui/icon-button.vue";
import { useShowStore } from "@/stores/show-store";

const props = defineProps<{
  payload: TimelineTableItem;
  isNear: boolean;
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
  <div
    v-if="isNear"
    :class="css({ position: 'absolute', right: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', zIndex: 'popover' })"
  >
    <IconButton
      size="2xs"
      ariaLabel="Add event before"
      @click.stop="handleCreate(true)"
    >
      <Plus :size="12" aria-hidden />
    </IconButton>
    <IconButton
      size="2xs"
      ariaLabel="Add event after"
      @click.stop="handleCreate(false)"
    >
      <Plus :size="12" aria-hidden />
    </IconButton>
  </div>
</template>
