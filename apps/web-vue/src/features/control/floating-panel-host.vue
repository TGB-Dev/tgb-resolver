<script setup lang="ts">
import { DialogContent, DialogPositioner, DialogRoot } from "@ark-ui/vue";
import { dialog } from "@styled-system/recipes";
import { TimelineEventType } from "@tgb-resolver/contracts";
import { computed } from "vue";

import { useFloatingPanelStore } from "@/features/control/floating-panel-store";
import { FloatingPanelType } from "@/features/control/floating-panel-types";
import ExtensionConfigPanel from "@/features/extensions/config-panel.vue";
import { useShowStore } from "@/stores/show-store";

defineOptions({ name: "FloatingPanelHost" });
const store = useFloatingPanelStore();
const show = useShowStore();
const dialogClasses = dialog({ placement: "center", size: "md" });
const activePanel = computed(() => store.panels[store.panels.length - 1]);
const extensionEvent = computed(() => {
  const eventId = activePanel.value?.props.value.eventId;
  const event = typeof eventId === "number" ? show.showEvents[eventId] : undefined;
  return event?.type === TimelineEventType.CUS ? event : undefined;
});
function close(accepted: boolean) {
  const panel = activePanel.value;
  if (panel) store.closeFloatingPanel(panel, accepted);
}
</script>
<template>
  <DialogRoot :open="store.panels.length > 0">
    <DialogPositioner :class="dialogClasses.positioner"><DialogContent :class="dialogClasses.content">
      <ExtensionConfigPanel v-if="activePanel?.type === FloatingPanelType.ExtensionConfig && extensionEvent" :event-id="extensionEvent.id" :ext-id="extensionEvent.payload.extId" :payload="extensionEvent.payload.extPayload" @cancel="close(false)" @save="close(true)" />
      <div v-else-if="activePanel">{{ activePanel.title }}</div>
    </DialogContent></DialogPositioner>
  </DialogRoot>
</template>
