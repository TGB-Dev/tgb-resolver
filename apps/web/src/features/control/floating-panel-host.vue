<script setup lang="ts">
import { useEventListener } from "@vueuse/core";
import { type Component, computed } from "vue";

import CreateEventPanel from "@/features/control/create-event-panel.vue";
import FloatingPanelFrame from "@/features/control/floating-panel-frame.vue";
import { useFloatingPanelStore } from "@/features/control/floating-panel-store";
import {
  type FloatingPanelHandle,
  FloatingPanelType,
  floatingPanelConfig,
} from "@/features/control/floating-panel-types";
import ImportShowPanel from "@/features/control/import-show-panel.vue";
import InspectShowPanel from "@/features/control/inspect-show-panel.vue";
import ExtensionConfigPanel from "@/features/extensions/config-panel.vue";

const store = useFloatingPanelStore();

const PANEL_REGISTRY: Record<FloatingPanelType, Component> = {
  [FloatingPanelType.ExtensionConfig]: ExtensionConfigPanel,
  [FloatingPanelType.CreateEvent]: CreateEventPanel,
  [FloatingPanelType.ImportShow]: ImportShowPanel,
  [FloatingPanelType.InspectShow]: InspectShowPanel,
};

const panelsView = computed(() =>
  store.panels.map((panel) => ({
    panel,
    config: floatingPanelConfig[panel.type],
    title: panel.title.value,
    body: PANEL_REGISTRY[panel.type],
  })),
);

function getDefaultPosition(size: { width: number; height: number }) {
  return {
    x: Math.max(0, (window.innerWidth - size.width) / 2),
    y: Math.max(0, (window.innerHeight - size.height) / 2),
  };
}

function onOpenChange(panel: FloatingPanelHandle, open: boolean) {
  if (!open) void store.requestFloatingPanelClose(panel);
}

useEventListener(window, "beforeunload", (event) => {
  if (store.hasDirtyPanels) {
    event.preventDefault();
  }
});
</script>

<template>
  <Teleport to="body">
    <FloatingPanelFrame
      v-for="entry in panelsView"
      :key="entry.panel.id"
      :open="true"
      :title="entry.title"
      :icon="entry.config.icon"
      :maximizable="entry.config.maximizable ?? false"
      :default-size="entry.config.size"
      :min-size="entry.config.minSize"
      :default-position="getDefaultPosition(entry.config.size)"
      :resizable="entry.config.resizable ?? true"
      :allow-overflow="false"
      :close-on-escape="true"
      strategy="fixed"
      @open-change="(details: { open: boolean }) => onOpenChange(entry.panel, details.open)"
      @close="store.requestFloatingPanelClose(entry.panel)"
    >
      <component :is="entry.body" :panel="entry.panel" />
    </FloatingPanelFrame>
  </Teleport>
</template>
