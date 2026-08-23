<script setup lang="ts">
import { useSortable } from "@dnd-kit/vue/sortable";
import { css } from "@styled-system/css";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { useTemplateRef } from "vue";

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

const row = useTemplateRef<HTMLElement>("row");
// Live mode renders a static list outside the DragDropProvider, so sortable
// wiring must not run there (useSortable returns undefined without a provider).
const sortable = props.isLive
  ? undefined
  : useSortable({
      id: props.payload.id,
      index: () => props.index,
      group: "timeline",
      element: row,
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
