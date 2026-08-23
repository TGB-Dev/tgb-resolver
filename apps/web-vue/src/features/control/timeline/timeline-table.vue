<script setup lang="ts">
import type { DragEndEvent } from "@dnd-kit/vue";
import { DragDropProvider } from "@dnd-kit/vue";
import { css } from "@styled-system/css";
import { PlaybackStatus, TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem as TimelineRowPayload } from "@tgb-resolver/realtime";
import { computed, ref, watch } from "vue";

import { useControlIsLive, useControlShowQuery, useMoveTimelineEventMutation, useSeekPlaybackMutation } from "@/features/control/composables/use-show";
import { usePlaybackStore } from "@/features/control/playback-store";
import { animateScrollIntoView } from "@/features/leaderboard/utils/scroll";
import Spinner from "@/features/shared/ui/spinner.vue";
import { useShowStore } from "@/stores/show-store";

import TimelineContextMenu from "./timeline-context-menu.vue";
import { createTimelineReorderState } from "./timeline-reorder-state";
import TimelineSortableRow from "./timeline-sortable-row.vue";
import TimelineTableHeader from "./timeline-table-header.vue";

const showQuery = useControlShowQuery();
const showStore = useShowStore();
const playback = usePlaybackStore();
const isLive = useControlIsLive();
const seekPlayback = useSeekPlaybackMutation();
const moveEvent = useMoveTimelineEventMutation();

const containerRef = ref<HTMLElement | null>(null);
const contextTarget = ref<{ payload: TimelineRowPayload; x: number; y: number } | null>(null);
const reorderState = createTimelineReorderState();

const displayIds = computed(() => (isLive.value ? showStore.showOrderedIds : (reorderState.rows.value ?? showStore.showOrderedIds)));
const displayRows = computed(() =>
  displayIds.value
    .map((id) => showStore.timelineItemsById[id])
    .filter((row): row is TimelineRowPayload => row !== undefined),
);

function onSeek(id: number) {
  const status = playback.status;
  if (status !== PlaybackStatus.RUNNING && status !== PlaybackStatus.PAUSED) return;
  seekPlayback.mutate(id);
}

function scrollEventToTop(eventId: number | null) {
  if (!containerRef.value || eventId == null) return;
  const el = containerRef.value.querySelector<HTMLElement>(`[data-event-id="${eventId}"]`);
  if (!el) return;
  animateScrollIntoView(el, containerRef.value, { block: "start", duration: 0.15 });
}

function scrollToCurrent() {
  scrollEventToTop(playback.currentCueId);
}

defineExpose({
  scrollToCurrent,
});

watch(
  () => playback.currentCueId,
  (target) => {
    if (target != null && showStore.timelineItemsById[target]?.triggerOffsetSeconds != null) {
      return;
    }
    requestAnimationFrame(() => scrollEventToTop(target));
  },
);

function reorder(event: DragEndEvent) {
  if (isLive.value) return;
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
  moveEvent.mutate(
    { eventId: sourceId, relativeToEventId, before },
    {
      onError: () => reorderState.take(),
      onSettled: () => reorderState.take(),
    },
  );
}

function openContextMenu(event: MouseEvent, payload: TimelineRowPayload) {
  event.preventDefault();
  event.stopPropagation();
  contextTarget.value = {
    payload,
    x: Math.max(8, Math.min(event.clientX, window.innerWidth - 180)),
    y: Math.max(8, Math.min(event.clientY, window.innerHeight - 110)),
  };
}
</script>

<template>
  <div
    v-if="showQuery.isLoading.value"
    :class="css({ display: 'flex', alignItems: 'center', justifyContent: 'center', boxSize: 'full' })"
  >
    <Spinner size="lg" label="" aria-hidden="true" />
  </div>

  <div
    v-else-if="showQuery.error.value"
    :class="css({ display: 'flex', alignItems: 'center', justifyContent: 'center', boxSize: 'full', px: 4 })"
  >
    <p>{{ showQuery.error.value.message }}</p>
  </div>

  <div
    v-else-if="displayIds.length === 0"
    :class="css({ display: 'flex', alignItems: 'center', justifyContent: 'center', boxSize: 'full' })"
  >
    <p>No show loaded.</p>
  </div>

  <div
    v-else
    :class="css({ boxSize: 'full', display: 'flex', flexDirection: 'column', minH: 0, overflow: 'hidden' })"
  >
    <TimelineTableHeader :is-live="isLive" />

    <div
      ref="containerRef"
      :class="css({
        flex: 1,
        minH: 0,
        overflow: 'auto',
        '& [data-timeline-row]:nth-of-type(odd) [data-event-id]': { bg: 'bg' },
        '& [data-timeline-row]:nth-of-type(even) [data-event-id]': { bg: 'bg.emphasized' },
      })"
    >
      <div :class="css({ w: 'full', display: 'flex', flexDirection: 'column', alignItems: 'stretch' })">
        <template v-if="displayIds.length > 0">
          <DragDropProvider v-if="!isLive" @drag-end="reorder">
            <TimelineSortableRow
              v-for="(row, index) in displayRows"
              :key="row.id"
              :payload="row"
              :index="index"
              :is-live="isLive"
              @seek="onSeek"
              @contextmenu="openContextMenu"
            />
          </DragDropProvider>
          <!-- Live mode renders a static list: no dnd context, no sortable wiring -->
          <template v-else>
            <TimelineSortableRow
              v-for="(row, index) in displayRows"
              :key="row.id"
              :payload="row"
              :index="index"
              :is-live="isLive"
              @seek="onSeek"
              @contextmenu="openContextMenu"
            />
          </template>
        </template>
      </div>
    </div>

    <TimelineContextMenu
      v-if="contextTarget"
      :target="contextTarget.payload"
      :x="contextTarget.x"
      :y="contextTarget.y"
      @close="contextTarget = null"
    />
  </div>
</template>
