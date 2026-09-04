<script setup lang="ts">
import { useSortable } from "@dnd-kit/vue/sortable";
import { css } from "@styled-system/css";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { computed, useTemplateRef } from "vue";

import TimelineTableItemView from "./timeline-table-item.vue";

const props = defineProps<{
  payload: TimelineTableItem;
  index: number;
  isLive?: boolean;
}>();

const emit = defineEmits<{
  seek: [id: number];
  contextmenu: [event: MouseEvent, payload: TimelineTableItem];
}>();

// Mirrors the React reference (timeline-table.tsx :: TimelineRowItem):
// sortable wiring only in edit mode, draggable only for CUS events.
const isReorderable = computed(() => props.payload.type === TimelineEventType.CUS && !props.isLive);

const row = useTemplateRef<HTMLElement>("row");
// The drag handle (grip button) lives inside TimelineTableItemView; without
// registering it as `handle`, dnd-kit's preventActivation blocks drags that
// start on interactive elements (buttons) anywhere in the row.
const handle = () => row.value?.querySelector<HTMLElement>("[data-drag-handle]") ?? null;
// Live mode renders a static list outside the DragDropProvider, so sortable
// wiring must not run there.
const sortable = props.isLive
  ? undefined
  : useSortable({
      id: props.payload.id,
      index: () => props.index,
      group: "timeline",
      element: row,
      handle,
      disabled: { draggable: !isReorderable.value },
    });

const wrapperClass = css({ position: "relative", userSelect: "none" });
</script>

<template>
  <div
    ref="row"
    class="group"
    :class="wrapperClass"
    data-timeline-row
    :data-dragging="sortable?.isDragging.value || undefined"
  >
    <TimelineTableItemView
      :payload="payload"
      :is-live="isLive"
      @seek="emit('seek', $event)"
      @contextmenu="emit('contextmenu', $event, payload)"
    />
  </div>
</template>
