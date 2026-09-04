<script setup lang="ts">
import { css, cx } from "@styled-system/css";
import { button } from "@styled-system/recipes";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { useEventListener } from "@vueuse/core";

import { useDeleteTimelineEventMutation } from "@/features/control/composables/use-show";
import { useFloatingPanelStore } from "@/features/control/floating-panel-store";
import { FloatingPanelType } from "@/features/control/floating-panel-types";
import { useConfirmActionStore } from "@/stores/confirm-action-store";

const props = defineProps<{ target: TimelineTableItem; x: number; y: number }>();
const emit = defineEmits<{ close: [] }>();

const floatingPanels = useFloatingPanelStore();
const confirm = useConfirmActionStore();
const deleteEvent = useDeleteTimelineEventMutation();

const boxClass = css({
  position: "fixed",
  zIndex: "popover",
  bg: "bg.panel",
  borderWidth: 1,
  borderColor: "border",
  rounded: "md",
  shadow: "lg",
  py: "1",
  minW: "160px",
});
const itemClass = cx(
  button({ variant: "ghost", size: "sm" }),
  css({
    w: "full",
    justifyContent: "flex-start",
    fontWeight: "normal",
    px: "3",
    borderRadius: "none",
  }),
);
const deleteItemClass = css({ color: "fg.error", _hover: { bg: "bg.error", color: "fg.error" } });

function edit() {
  emit("close");
  floatingPanels.openFloatingPanel(FloatingPanelType.ExtensionConfig, `Edit Event #${props.target.position}`, {
    eventId: props.target.id,
  });
}

async function remove() {
  emit("close");
  const accepted = await confirm.confirmAction({
    title: "Delete Event",
    message: `Delete custom event #${props.target.position}?`,
    confirmLabel: "Delete",
    cancelLabel: "Cancel",
  });
  if (accepted) await deleteEvent.mutateAsync(props.target.id);
}

// Mirror the React reference: dismiss when pressing anywhere outside the menu.
useEventListener(
  document,
  "pointerdown",
  (e) => {
    if ((e.target as HTMLElement).closest("[data-timeline-context-menu]")) return;
    emit("close");
  },
  { passive: true },
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="target.type === TimelineEventType.CUS"
      data-timeline-context-menu
      :class="boxClass"
      :style="{ left: `${x}px`, top: `${y}px` }"
    >
      <button type="button" :class="itemClass" @click="edit">Edit</button>
      <button type="button" :class="[itemClass, deleteItemClass]" @click="remove">Delete</button>
    </div>
  </Teleport>
</template>
