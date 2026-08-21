<script setup lang="ts">
import { FloatingPanel } from "@ark-ui/vue";
import { Maximize2, Minimize2, Puzzle, X } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { floatingPanel } from "@styled-system/recipes";
import { useEventListener } from "@vueuse/core";
import { type Component, computed } from "vue";

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

defineSlots<{
  icon(props: { panel: FloatingPanelHandle; type: FloatingPanelType }): unknown;
}>();

const store = useFloatingPanelStore();
const classes = floatingPanel();
const resizeAxes = FloatingPanel.resizeTriggerAxes;

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

useEventListener(window, "beforeunload", (event) => {
  if (store.hasDirtyPanels) {
    event.preventDefault();
  }
});
</script>

<template>
  <Teleport to="body">
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
      <FloatingPanel.Positioner
        :class="cx(classes.positioner, css({ zIndex: 'modal' }))"
      >
        <FloatingPanel.Content :class="classes.content">
          <FloatingPanel.Header :class="cx(classes.header, css({
            display: 'flex',
            flexDirection: 'row',
            gap: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }))">
            <FloatingPanel.DragTrigger :class="classes.dragTrigger">
              <slot name="icon" :panel="entry.panel" :type="entry.panel.type">
                <Puzzle :size="16" aria-hidden />
              </slot>
              <FloatingPanel.Title :class="classes.title">{{ entry.title }}</FloatingPanel.Title>
            </FloatingPanel.DragTrigger>
            <FloatingPanel.Control :class="cx(classes.control, css({
              display: 'flex',
              flexDirection: 'row',
              gap: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }))">
              <FloatingPanel.StageTrigger
                v-if="entry.config.maximizable"
                stage="maximized"
                :class="classes.stageTrigger"
                aria-label="Maximize panel"
              >
                <!-- This is a bit smaller, as the X icon has some paddings around that (?) -->
                <Maximize2 :size="10" aria-hidden />
              </FloatingPanel.StageTrigger>
              <FloatingPanel.StageTrigger
                v-if="entry.config.maximizable"
                stage="default"
                :class="classes.stageTrigger"
                aria-label="Restore panel"
              >
                <Minimize2 :size="12" aria-hidden />
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
          <template v-if="entry.config.resizable ?? true">
            <FloatingPanel.ResizeTrigger
              v-for="axis in resizeAxes"
              :key="axis"
              :axis="axis"
              :class="classes.resizeTrigger"
            />
          </template>
        </FloatingPanel.Content>
      </FloatingPanel.Positioner>
    </FloatingPanel.Root>
  </Teleport>
</template>
