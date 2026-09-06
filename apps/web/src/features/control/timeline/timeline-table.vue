<script setup lang="ts">
import { move } from "@dnd-kit/helpers";
import { DragDropProvider, type DragEndEvent, type DragOverEvent } from "@dnd-kit/vue";
import { css } from "@styled-system/css";
import { PlaybackStatus, TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem as TimelineRowPayload } from "@tgb-resolver/realtime";
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from "vue";

import { useControlIsLive, useControlShowQuery, useMoveTimelineEventMutation, useSeekPlaybackMutation } from "@/features/control/composables/use-show";
import { usePlaybackStore } from "@/features/control/playback-store";
import { animateScrollIntoView } from "@/features/leaderboard/utils/scroll";
import { parseErrorMessage } from "@/features/shared/ui/error-message";
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

const containerRef = useTemplateRef<HTMLElement>("containerRef");
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

// Scroll to the current event on mount. The rows may not exist yet while the
// query is loading, so also fire once when the first row renders.
let hasScrolledOnMount = false;
function scrollToCurrentOnMount() {
  if (hasScrolledOnMount || displayRows.value.length === 0) return;
  hasScrolledOnMount = true;
  void nextTick(() => requestAnimationFrame(scrollToCurrent));
}

onMounted(scrollToCurrentOnMount);
watch(
  () => displayRows.value.length > 0,
  (hasRows) => {
    if (hasRows) scrollToCurrentOnMount();
  },
);

watch(
  () => playback.currentCueId,
  (target) => {
    if (target != null && showStore.timelineItemsById[target]?.triggerOffsetSeconds != null) {
      return;
    }
    requestAnimationFrame(() => scrollEventToTop(target));
  },
);

// --- Reorder wiring, ported 1:1 from the React reference (timeline-table.tsx
// :: TimelineReorderList + commitReorder). DragOver keeps a provisional order;
// DragEnd commits it as a single move mutation with optimistic apply/revert.

type ReorderSnapshot = ReturnType<typeof showStore.optimisticallyReorderTimeline>;

function currentDisplay(): number[] {
  return reorderState.rows.value ?? showStore.showOrderedIds;
}

const isMovePending = computed(() => moveEvent.isPending.value);

let reorderSnapshot: ReorderSnapshot | null = null;

function onDragOver(event: DragOverEvent) {
  if (event.operation.canceled || isMovePending.value) return;
  reorderState.set(move(currentDisplay(), event));
}

function onDragEnd(event: DragEndEvent) {
  if (isMovePending.value) return;
  if (event.operation.canceled || event.operation.target == null) {
    // Esc / dropped outside any row: discard the provisional order.
    reorderState.take();
    return;
  }
  reorderState.set(move(currentDisplay(), event));
  commitReorder();
}

function commitReorder() {
  const nextRows = reorderState.take();
  if (!nextRows || isMovePending.value) return;

  // Find the row whose position changed; only CUS events are movable.
  const initialOrderedIds = showStore.showOrderedIds;
  let movedEventId: number | null = null;
  let targetIndex = -1;
  for (let i = 0; i < nextRows.length; i++) {
    const id = nextRows[i];
    if (id === undefined || id === initialOrderedIds[i]) continue;
    const event = showStore.showEvents[id];
    if (event?.type === TimelineEventType.CUS) {
      movedEventId = id;
      targetIndex = i;
      break;
    }
  }
  if (movedEventId == null || targetIndex < 0) return;

  const before = targetIndex === 0;
  const relativeToEventId = before ? nextRows[1] : nextRows[targetIndex - 1];
  if (relativeToEventId == null) return;

  const snapshot = showStore.optimisticallyReorderTimeline(nextRows);
  const expectedOrderedIds = showStore.showOrderedIds;
  reorderSnapshot = snapshot;
  moveEvent.mutate(
    { eventId: movedEventId, relativeToEventId, before },
    {
      onError: () => {
        if (reorderSnapshot) {
          showStore.restoreTimelineOrderIfCurrent(reorderSnapshot, expectedOrderedIds);
        }
      },
      onSettled: () => {
        reorderSnapshot = null;
      },
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
    <p>{{ parseErrorMessage(showQuery.error.value) }}</p>
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
          <DragDropProvider v-if="!isLive" @drag-over="onDragOver" @drag-end="onDragEnd">
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
