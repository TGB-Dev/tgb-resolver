<script setup lang="ts">
import { useSortable } from "@dnd-kit/vue/sortable";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { useTemplateRef } from "vue";

import TimelineTableItemView from "./timeline-table-item.vue";

defineOptions({ name: "ControlTimelineSortableRow" });

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
const sortable = useSortable({
  id: props.payload.id,
  index: () => props.index,
  group: "timeline",
  element: row,
});
</script>

<template>
  <div ref="row" :data-dragging="sortable.isDragging.value || undefined">
    <TimelineTableItemView
      :payload="payload"
      :is-live="isLive"
      @seek="emit('seek', $event)"
      @contextmenu="emit('contextmenu', $event, payload)"
    />
  </div>
</template>
