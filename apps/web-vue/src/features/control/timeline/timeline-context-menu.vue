<script setup lang="ts">
import { Menu } from "@ark-ui/vue";
import { menu } from "@styled-system/recipes";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";

import { useDeleteTimelineEventMutation } from "@/features/control/composables/use-show";
import { useFloatingPanelStore } from "@/features/control/floating-panel-store";
import { FloatingPanelType } from "@/features/control/floating-panel-types";
import { useConfirmActionStore } from "@/stores/confirm-action-store";

const props = defineProps<{ target: TimelineTableItem; x: number; y: number }>();
const emit = defineEmits<{ close: [] }>();

const floatingPanels = useFloatingPanelStore();
const confirm = useConfirmActionStore();
const deleteEvent = useDeleteTimelineEventMutation();
const menuClasses = menu();

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
</script>

<template>
  <Menu.Root
    v-if="target.type === TimelineEventType.CUS"
    :open="true"
    :anchor-point="{ x: props.x, y: props.y }"
    @open-change="(details: { open: boolean }) => { if (!details.open) emit('close') }"
  >
    <Menu.Positioner :class="menuClasses.positioner">
      <Menu.Content :class="menuClasses.content">
        <Menu.Item :class="menuClasses.item" value="edit" @select="edit">
          <Menu.ItemText :class="menuClasses.itemText">Edit</Menu.ItemText>
        </Menu.Item>
        <Menu.Item :class="menuClasses.item" value="remove" @select="remove">
          <Menu.ItemText :class="menuClasses.itemText">Delete</Menu.ItemText>
        </Menu.Item>
      </Menu.Content>
    </Menu.Positioner>
  </Menu.Root>
</template>
