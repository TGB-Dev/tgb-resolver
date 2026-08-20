<script setup lang="ts">
import {
  DialogBackdrop,
  DialogContent,
  DialogPositioner,
  DialogRoot,
} from "@ark-ui/vue";
import { Box } from "@styled-system/jsx";
import { dialog } from "@styled-system/recipes";
import { TimelineEventType } from "@tgb-resolver/contracts";
import { computed } from "vue";

import CreateEventPanel from "@/features/control/create-event-panel.vue";
import { useFloatingPanelStore } from "@/features/control/floating-panel-store";
import { FloatingPanelType } from "@/features/control/floating-panel-types";
import ImportShowPanel from "@/features/control/import-show-panel.vue";
import InspectShowPanel from "@/features/control/inspect-show-panel.vue";
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
  return event && event.type === TimelineEventType.CUS ? event : undefined;
});

function close(accepted: boolean) {
  const panel = activePanel.value;
  if (panel) store.closeFloatingPanel(panel, accepted);
}
</script>

<template>
  <DialogRoot :open="store.panels.length > 0">
    <DialogBackdrop :class="dialogClasses.backdrop" />
    <DialogPositioner :class="dialogClasses.positioner">
      <DialogContent :class="dialogClasses.content">
        <template v-if="activePanel">
          <!-- Extension Config -->
          <ExtensionConfigPanel
            v-if="activePanel.type === FloatingPanelType.ExtensionConfig && extensionEvent"
            :event-id="extensionEvent.id"
            :ext-id="extensionEvent.payload.extId"
            :payload="extensionEvent.payload.extPayload"
            @cancel="close(false)"
            @save="close(true)"
          />

          <!-- Create Event Panel -->
          <CreateEventPanel
            v-else-if="activePanel.type === FloatingPanelType.CreateEvent"
            :panel="activePanel"
            :relative-to-event-id="Number(activePanel.props.value.relativeToEventId ?? 0)"
            :before="Boolean(activePanel.props.value.before)"
          />

          <!-- Import Show Panel -->
          <ImportShowPanel
            v-else-if="activePanel.type === FloatingPanelType.ImportShow"
            :panel="activePanel"
          />

          <!-- Inspect Show Panel -->
          <InspectShowPanel
            v-else-if="activePanel.type === FloatingPanelType.InspectShow"
            :panel="activePanel"
          />

          <!-- Fallback -->
          <Box v-else p="4">
            {{ activePanel.title }}
          </Box>
        </template>
      </DialogContent>
    </DialogPositioner>
  </DialogRoot>
</template>
