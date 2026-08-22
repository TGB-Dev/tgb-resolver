<script setup lang="ts">
import { Plus } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import type { TimelineTableItem } from "@tgb-resolver/realtime";

import { useFloatingPanelStore } from "@/features/control/floating-panel-store";
import { FloatingPanelType } from "@/features/control/floating-panel-types";
import IconButton from "@/features/shared/ui/icon-button.vue";
import Tooltip from "@/features/shared/ui/tooltip.vue";
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

const beforeClass = css({
  position: "absolute",
  top: 0,
  right: 0,
  transform: "translateY(-100%)",
  borderTopRadius: "md",
  borderBottomRadius: 0,
  bg: props.payload.id & 1 ? "bg.subtle" : "bg.muted",
  zIndex: 20,
  _hover: { bg: "bg.emphasized", color: "fg" },
});

const afterClass = css({
  position: "absolute",
  bottom: 0,
  right: 0,
  transform: "translateY(100%)",
  borderTopRadius: 0,
  borderBottomRadius: "md",
  bg: props.payload.id & 1 ? "bg.subtle" : "bg.muted",
  zIndex: 20,
  _hover: { bg: "bg.emphasized", color: "fg" },
});
</script>

<template>
  <template v-if="isNear">
    <Tooltip content="Add event before" :open-delay="0">
      <IconButton
        :class="cx('add-btn-wrapper', beforeClass)"
        variant="subtle"
        size="2xs"
        ariaLabel="Add event before"
        @click.stop="handleCreate(true)"
      >
        <Plus :size="12" aria-hidden />
      </IconButton>
    </Tooltip>

    <Tooltip content="Add event after" :open-delay="0">
      <IconButton
        :class="cx('add-btn-wrapper', afterClass)"
        variant="subtle"
        size="2xs"
        ariaLabel="Add event after"
        @click.stop="handleCreate(false)"
      >
        <Plus :size="12" aria-hidden />
      </IconButton>
    </Tooltip>
  </template>
</template>
