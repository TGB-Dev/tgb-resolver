<script setup lang="ts">
import { FloatingPanel } from "@ark-ui/vue";
import { GripHorizontal, Maximize2, Minimize2, X } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { floatingPanel } from "@styled-system/recipes";
import { type Component, computed, onMounted, onScopeDispose } from "vue";

import CreateEventPanel from "@/features/control/create-event-panel.vue";
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
const classes = floatingPanel();

const RESIZE_AXES = ["e", "se", "s", "sw", "w", "nw", "n", "ne"] as const;

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

onMounted(() => {
  const onBeforeUnload = (event: BeforeUnloadEvent) => {
    if (store.hasDirtyPanels) {
      event.preventDefault();
    }
  };
  window.addEventListener("beforeunload", onBeforeUnload);
  onScopeDispose(() => window.removeEventListener("beforeunload", onBeforeUnload));
});
</script>

<template>
  <FloatingPanel.Root
    v-for="entry in panelsView"
    :key="entry.panel.id"
    :open="true"
    :default-size="entry.config.size"
    :min-size="entry.config.minSize"
    :default-position="getDefaultPosition(entry.config.size)"
    :resizable="entry.config.resizable ?? true"
    :allow-overflow="false"
    :close-on-escape="true"
    strategy="fixed"
    @open-change="(details: { open: boolean }) => onOpenChange(entry.panel, details.open)"
  >
    <FloatingPanel.Positioner :class="classes.positioner">
      <FloatingPanel.Content :class="classes.content">
        <FloatingPanel.Header :class="classes.header">
          <FloatingPanel.DragTrigger :class="classes.dragTrigger">
            <GripHorizontal aria-hidden />
            <FloatingPanel.Title :class="classes.title">{{ entry.title }}</FloatingPanel.Title>
          </FloatingPanel.DragTrigger>
          <FloatingPanel.Control :class="classes.control">
            <FloatingPanel.StageTrigger
              v-if="entry.config.maximizable"
              stage="maximized"
              :class="classes.stageTrigger"
              aria-label="Maximize panel"
            >
              <Maximize2 :size="14" aria-hidden />
            </FloatingPanel.StageTrigger>
            <FloatingPanel.StageTrigger
              v-if="entry.config.maximizable"
              stage="default"
              :class="classes.stageTrigger"
              aria-label="Restore panel"
            >
              <Minimize2 :size="14" aria-hidden />
            </FloatingPanel.StageTrigger>
            <FloatingPanel.CloseTrigger
              :class="classes.closeTrigger"
              aria-label="Close panel"
              @click="store.requestFloatingPanelClose(entry.panel)"
            >
              <X :size="14" aria-hidden />
            </FloatingPanel.CloseTrigger>
          </FloatingPanel.Control>
        </FloatingPanel.Header>
        <FloatingPanel.Body :class="cx(classes.body, css({ padding: 4 }))">
          <component :is="PANEL_REGISTRY[entry.panel.type]" :panel="entry.panel" />
        </FloatingPanel.Body>
        <FloatingPanel.ResizeTrigger
          v-for="axis in RESIZE_AXES"
          v-show="entry.config.resizable"
          :key="axis"
          :axis="axis"
          :class="classes.resizeTrigger"
        />
      </FloatingPanel.Content>
    </FloatingPanel.Positioner>
  </FloatingPanel.Root>
</template>
