<script setup lang="ts">
import { css } from "@styled-system/css";
import { Box, VStack } from "@styled-system/jsx";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { computed, onMounted, onUnmounted } from "vue";

import { useDeleteTimelineEventMutation } from "@/features/control/composables/use-show";
import { useFloatingPanelStore } from "@/features/control/floating-panel-store";
import { FloatingPanelType } from "@/features/control/floating-panel-types";
import Button from "@/features/shared/ui/button.vue";
import { useConfirmActionStore } from "@/stores/confirm-action-store";const props = defineProps<{ target: TimelineTableItem; x: number; y: number }>();
const emit = defineEmits<{ close: [] }>();
const floatingPanels = useFloatingPanelStore();
const confirm = useConfirmActionStore();
const deleteEvent = useDeleteTimelineEventMutation();
const positionClass = computed(() => css({ position: "fixed", left: `${props.x}px`, top: `${props.y}px`, zIndex: "popover" }));

function closeOnPointerDown(event: PointerEvent) {
  const target = event.target;
  if (target instanceof HTMLElement && target.closest("[data-timeline-context-menu]")) return;
  emit("close");
}
function edit() {
  emit("close");
  floatingPanels.openFloatingPanel(FloatingPanelType.ExtensionConfig, `Edit Event #${props.target.position}`, { eventId: props.target.id });
}
async function remove() {
  emit("close");
  const accepted = await confirm.confirmAction({ title: "Delete Event", message: `Delete custom event #${props.target.position}?`, confirmLabel: "Delete", cancelLabel: "Cancel" });
  if (accepted) await deleteEvent.mutateAsync(props.target.id);
}
onMounted(() => document.addEventListener("pointerdown", closeOnPointerDown));
onUnmounted(() => document.removeEventListener("pointerdown", closeOnPointerDown));
</script>
<template>
  <Box v-if="target.type === TimelineEventType.CUS" data-timeline-context-menu :class="positionClass" minW="40" borderWidth="1" borderColor="border" rounded="md" bg="bg.panel" shadow="lg" p="1">
    <VStack gap="0" alignItems="stretch">
      <Button variant="ghost" size="sm" justifyContent="flex-start" @click="edit">Edit</Button>
      <Button variant="ghost" size="sm" colorPalette="red" justifyContent="flex-start" @click="remove">Delete</Button>
    </VStack>
  </Box>
</template>
