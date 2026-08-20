<script setup lang="ts">
import type { DragEndEvent } from "@dnd-kit/vue";
import { DragDropProvider } from "@dnd-kit/vue";
import { Box, Center, VStack } from "@styled-system/jsx";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem as TimelineRowPayload } from "@tgb-resolver/realtime";
import { computed, ref } from "vue";

import { useControlShowQuery, useMoveTimelineEventMutation, useSeekPlaybackMutation } from "@/features/control/composables/use-show";
import { usePlaybackStore } from "@/features/control/playback-store";
import { useShowStore } from "@/stores/show-store";

import TimelineContextMenu from "./timeline-context-menu.vue";
import { createTimelineReorderState } from "./timeline-reorder-state";
import TimelineSortableRow from "./timeline-sortable-row.vue";
import TimelineTableHeader from "./timeline-table-header.vue";

defineOptions({ name: "ControlTimelineTable" });
const showQuery = useControlShowQuery();
const showStore = useShowStore();
const playback = usePlaybackStore();
const seekPlayback = useSeekPlaybackMutation();
const moveEvent = useMoveTimelineEventMutation();
const contextTarget = ref<{ payload: TimelineRowPayload; x: number; y: number } | null>(null);
const reorderState = createTimelineReorderState();
const displayIds = computed(() => reorderState.rows.value ?? showStore.showOrderedIds);
const displayRows = computed(() => displayIds.value.map((id) => showStore.timelineItemsById[id]).filter((row): row is TimelineRowPayload => row !== undefined));
function reorder(event: DragEndEvent) {
  const sourceId = event.operation.source?.id;
  const targetId = event.operation.target?.id;
  if (event.canceled || typeof sourceId !== "number" || typeof targetId !== "number") {
    reorderState.take();
    return;
  }
  const current = [...displayIds.value];
  const sourceIndex = current.indexOf(sourceId);
  const targetIndex = current.indexOf(targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
  const moved = showStore.showEvents[sourceId];
  if (!moved || moved.type !== TimelineEventType.CUS) return;
  current.splice(sourceIndex, 1);
  current.splice(targetIndex, 0, sourceId);
  const before = targetIndex === 0;
  const relativeToEventId = before ? current[1] : current[targetIndex - 1];
  if (relativeToEventId == null) return;
  reorderState.set(current);
  moveEvent.mutate({ eventId: sourceId, relativeToEventId, before }, { onError: () => reorderState.take(), onSettled: () => reorderState.take() });
}
function openContextMenu(event: MouseEvent, payload: TimelineRowPayload) {
  event.preventDefault();
  event.stopPropagation();
  contextTarget.value = { payload, x: Math.max(8, Math.min(event.clientX, window.innerWidth - 180)), y: Math.max(8, Math.min(event.clientY, window.innerHeight - 110)) };
}
</script>

<template>
  <Center h="full" px="4" overflow="auto">
    <VStack w="full" alignItems="stretch">
      <TimelineTableHeader />
      <DragDropProvider v-if="displayIds.length" @drag-end="reorder">
        <TimelineSortableRow v-for="(row, index) in displayRows" :key="row.id" :payload="row" :index="index" :is-live="playback.currentEventId === row.id" @seek="seekPlayback.mutate" @contextmenu="openContextMenu" />
      </DragDropProvider>
      <Box v-if="showQuery.isLoading.value || showStore.rows.length === 0" color="fg.muted" fontSize="sm">{{ showQuery.isLoading.value ? "Loading timeline…" : "No timeline events" }}</Box>
    </VStack>
    <TimelineContextMenu v-if="contextTarget" :target="contextTarget.payload" :x="contextTarget.x" :y="contextTarget.y" @close="contextTarget = null" />
  </Center>
</template>
