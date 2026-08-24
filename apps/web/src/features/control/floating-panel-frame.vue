<script setup lang="ts">
import {
  FloatingPanel,
  type FloatingPanelBodyProps,
  type FloatingPanelHeaderProps,
  type FloatingPanelPositionerProps,
  type FloatingPanelRootProps,
} from "@ark-ui/vue";
import { Maximize2, Minimize2, Puzzle, X } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { floatingPanel } from "@styled-system/recipes";
import { type Component, computed } from "vue";

interface FloatingPanelFrameProps extends FloatingPanelRootProps {
  title: string;
  icon?: Component;
  maximizable?: boolean;
  positionerProps?: FloatingPanelPositionerProps;
  headerProps?: FloatingPanelHeaderProps;
  bodyProps?: FloatingPanelBodyProps;
}

const props = withDefaults(defineProps<FloatingPanelFrameProps>(), {
  icon: undefined,
  maximizable: false,
});

defineEmits<{ close: [] }>();

const rootProps = computed(() => {
  const { title: _title, icon: _icon, maximizable: _maximizable, ...rest } = props;
  return rest;
});

const classes = floatingPanel();
const resizeAxes = FloatingPanel.resizeTriggerAxes;

const headerLayout = css({
  display: "flex",
  flexDirection: "row",
  gap: 1,
  alignItems: "center",
  justifyContent: "center",
});
const controlLayout = css({
  display: "flex",
  flexDirection: "row",
  gap: 1,
  alignItems: "center",
  justifyContent: "center",
});
</script>

<template>
  <FloatingPanel.Root v-bind="{ ...rootProps, ...$attrs }">
    <!-- Zag sets an inline `z-index: var(--z-index)` (= stackIndex + 1 ~= 1) on
         the positioner, which would override any recipe class value. Force the
         popover layer with `!important` so panels always sit above app content. -->
    <FloatingPanel.Positioner
      :class="cx(classes.positioner, css({ zIndex: 'popover!' }))"
      v-bind="positionerProps"
    >
      <FloatingPanel.Content :class="classes.content">
        <slot name="header">
          <FloatingPanel.Header :class="cx(classes.header, headerLayout)">
            <FloatingPanel.DragTrigger :class="classes.dragTrigger">
              <component :is="icon ?? Puzzle" :size="16" aria-hidden />
              <FloatingPanel.Title :class="classes.title">{{ title }}</FloatingPanel.Title>
            </FloatingPanel.DragTrigger>
            <FloatingPanel.Control :class="cx(classes.control, controlLayout)">
              <FloatingPanel.StageTrigger
                v-if="maximizable"
                stage="maximized"
                :class="classes.stageTrigger"
                aria-label="Maximize panel"
              >
                <!-- Slightly smaller: the X icon has some built-in padding -->
                <Maximize2 :size="10" aria-hidden />
              </FloatingPanel.StageTrigger>
              <FloatingPanel.StageTrigger
                v-if="maximizable"
                stage="default"
                :class="classes.stageTrigger"
                aria-label="Restore panel"
              >
                <Minimize2 :size="12" aria-hidden />
              </FloatingPanel.StageTrigger>
              <FloatingPanel.CloseTrigger
                :class="classes.closeTrigger"
                aria-label="Close panel"
                @click="$emit('close')"
              >
                <X :size="14" aria-hidden />
              </FloatingPanel.CloseTrigger>
            </FloatingPanel.Control>
          </FloatingPanel.Header>
        </slot>
        <FloatingPanel.Body :class="cx(classes.body, css({ padding: 4 }))" v-bind="bodyProps">
          <slot />
        </FloatingPanel.Body>
        <template v-if="resizable ?? true">
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
</template>
