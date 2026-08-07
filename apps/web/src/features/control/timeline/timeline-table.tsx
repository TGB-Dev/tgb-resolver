import { Box, Center, Spinner, Text } from "@chakra-ui/react";
import { useComputed, useSignalEffect } from "@preact/signals-react";
import { For } from "@preact/signals-react/utils";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineEvent, TimelineTableItem } from "@tgb-resolver/realtime";
import { type DragControls, Reorder, useDragControls } from "motion/react";
import { memo, type RefObject, useCallback, useRef } from "react";

import {
  useControlIsLive,
  useControlShowQuery,
  useMoveTimelineEventMutation,
  useSeekPlaybackMutation,
} from "@/features/control/hooks";
import { playbackModel } from "@/features/control/playback-model";
import { animateScrollIntoView } from "@/features/leaderboard/utils/scroll";
import { showModel } from "@/features/shared/show-model";

import { createTimelineReorderState } from "./timeline-reorder-state";
import { TimelineRowContextMenu, useTimelineRowContextMenu } from "./timeline-row-context-menu";
import { ControlTimelineTableHeader, ControlTimelineTableItem } from "./timeline-table-item";

export interface ControlTimelineTableHandle {
  scrollToCurrent: () => void;
}

interface ControlTimelineTableProps {
  apiRef?: { current: ControlTimelineTableHandle | null };
}

const TIMELINE_CONTAINER_CSS = {
  "& [data-timeline-row]:nth-of-type(odd) [data-event-id]": { bg: "bg" },
  "& [data-timeline-row]:nth-of-type(even) [data-event-id]": { bg: "bg.emphasized" },
};

function scrollEventToTop(parent: HTMLDivElement | null, currentEventId: number | null) {
  if (!parent || currentEventId == null) return;
  const el = parent.querySelector<HTMLElement>(`[data-event-id="${currentEventId}"]`);
  if (!el) return;
  animateScrollIntoView(el, parent, { block: "start", duration: 0.15 });
}

export function ControlTimelineTable({ apiRef }: ControlTimelineTableProps) {
  const showQuery = useControlShowQuery();
  const orderedIds = showModel.showOrderedIds.value;
  const isLive = useControlIsLive();
  const seekPlayback = useSeekPlaybackMutation();
  const moveEvent = useMoveTimelineEventMutation();
  const timelineContextMenu = useTimelineRowContextMenu();

  const seekRef = useRef(seekPlayback.mutate);
  seekRef.current = seekPlayback.mutate;
  const onSeek = useCallback((id: number) => seekRef.current(id), []);

  const openContextMenuRef = useRef(timelineContextMenu.open);
  openContextMenuRef.current = timelineContextMenu.open;
  const onOpenContextMenu = useCallback(
    (e: React.MouseEvent, payload: TimelineTableItem) => openContextMenuRef.current(e, payload),
    [],
  );

  const parentRef = useRef<HTMLDivElement>(null);
  const movePendingRef = useRef(false);
  const moveEventRef = useRef(moveEvent.mutate);
  moveEventRef.current = moveEvent.mutate;
  const reorderSnapshotRef =
    useRef<ReturnType<typeof showModel.optimisticallyReorderTimeline>>(null);

  const commitReorder = useCallback((orderedIds: number[]) => {
    const initialOrderedIds = showModel.showOrderedIds.peek();
    // Find the row that changed position
    let movedItem: TimelineEvent | null = null;
    let targetIndex = -1;

    for (let i = 0; i < orderedIds.length; i++) {
      if (orderedIds[i] !== initialOrderedIds[i]) {
        // Check if this item is a CUS event (only CUS events can be moved)
        const event = showModel.showEvents.peek()[orderedIds[i]];
        if (event?.type === TimelineEventType.CUS) {
          movedItem = event;
          targetIndex = i;
          break;
        }
      }
    }

    if (!movedItem || targetIndex < 0) return;

    // Determine relative destination
    const before = targetIndex === 0;
    const relativeToEventId = before ? orderedIds[1] : orderedIds[targetIndex - 1];

    if (relativeToEventId != null) {
      const snapshot = showModel.optimisticallyReorderTimeline(orderedIds);
      const expectedOrderedIds = showModel.showOrderedIds.peek();
      reorderSnapshotRef.current = snapshot;
      movePendingRef.current = true;
      moveEventRef.current(
        {
          eventId: movedItem.id,
          relativeToEventId,
          before,
        },
        {
          onError: () => {
            const snapshot = reorderSnapshotRef.current;
            if (snapshot) {
              showModel.restoreTimelineOrderIfCurrent(snapshot, expectedOrderedIds);
            }
          },
          onSettled: () => {
            reorderSnapshotRef.current = null;
            movePendingRef.current = false;
          },
        },
      );
    }
  }, []);

  if (apiRef) {
    apiRef.current = {
      scrollToCurrent: () => {
        scrollEventToTop(parentRef.current, playbackModel.currentCueId.peek());
      },
    };
  }

  if (showQuery.isLoading) {
    return (
      <Center boxSize="full">
        <Spinner />
      </Center>
    );
  }

  if (showQuery.error) {
    return (
      <Center boxSize="full" px={4}>
        <Text>{showQuery.error.message}</Text>
      </Center>
    );
  }

  if (orderedIds.length === 0) {
    return (
      <Center boxSize="full">
        <Text>No show loaded.</Text>
      </Center>
    );
  }

  return (
    <Box boxSize="full" display="flex" flexDir="column" minH={0} overflow="hidden">
      <ControlTimelineTableHeader isLive={isLive} />

      <Box flex={1} minH={0} ref={parentRef} overflow="auto" css={TIMELINE_CONTAINER_CSS}>
        <CurrentEventScroller parentRef={parentRef} />
        <TimelineReorderList
          orderedIds={orderedIds}
          isLive={isLive}
          onSeek={onSeek}
          onOpenContextMenu={onOpenContextMenu}
          onCommitReorder={commitReorder}
          isMovePending={movePendingRef}
        />
      </Box>
      <TimelineRowContextMenu
        state={timelineContextMenu.state}
        onClose={timelineContextMenu.close}
      />
    </Box>
  );
}

function TimelineReorderList({
  orderedIds,
  isLive,
  onSeek,
  onOpenContextMenu,
  onCommitReorder,
  isMovePending,
}: {
  orderedIds: number[];
  isLive: boolean;
  onSeek: (id: number) => void;
  onOpenContextMenu: (e: React.MouseEvent, payload: TimelineTableItem) => void;
  onCommitReorder: (orderedIds: number[]) => void;
  isMovePending: RefObject<boolean>;
}) {
  const reorderStateRef = useRef<ReturnType<typeof createTimelineReorderState>>(null);
  if (!isLive && !reorderStateRef.current) reorderStateRef.current = createTimelineReorderState();
  // The reorder state is lazily created above and is non-null on every
  // edit-mode render; the `?.` only guards live mode, which never initializes it.
  const displayIds = reorderStateRef.current?.rows.value ?? orderedIds;
  const onCommitReorderRef = useRef(onCommitReorder);
  onCommitReorderRef.current = onCommitReorder;
  const commitDrag = useCallback(() => {
    const nextRows = reorderStateRef.current?.take();
    if (nextRows && !isMovePending.current) onCommitReorderRef.current(nextRows);
  }, [isMovePending]);

  if (isLive) {
    // Drop any uncommitted drag order when leaving edit mode so it cannot
    // resurface if the user toggles back.
    reorderStateRef.current?.take();
    return (
      <Box as="ul" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        <For each={orderedIds}>
          {(eventId) => (
            <TimelineStaticRow
              key={eventId}
              eventId={eventId}
              isLive={isLive}
              onSeek={onSeek}
              onOpenContextMenu={onOpenContextMenu}
            />
          )}
        </For>
      </Box>
    );
  }

  return (
    <Reorder.Group
      axis="y"
      values={displayIds}
      onReorder={(nextIds) => {
        if (!isMovePending.current) reorderStateRef.current?.set(nextIds);
      }}
      style={{ listStyle: "none", padding: 0, margin: 0 }}
    >
      {displayIds.map((eventId) => (
        <TimelineRowItem
          key={eventId}
          eventId={eventId}
          isLive={isLive}
          onSeek={onSeek}
          onOpenContextMenu={onOpenContextMenu}
          onCommitReorder={commitDrag}
        />
      ))}
    </Reorder.Group>
  );
}

const TimelineRowItem = memo(function TimelineRowItem({
  eventId,
  isLive,
  onSeek,
  onOpenContextMenu,
  onCommitReorder,
}: {
  eventId: number;
  isLive: boolean;
  onSeek: (id: number) => void;
  onOpenContextMenu: (e: React.MouseEvent, payload: TimelineTableItem) => void;
  onCommitReorder: () => void;
}) {
  const dragControls = useDragControls();
  const dragControlsRef = useRef<DragControls | null>(null);
  if (!dragControlsRef.current) dragControlsRef.current = dragControls;

  const payload = useComputed(() => showModel.timelineItemsById.value[eventId]);
  const isReorderable = payload.value?.type === TimelineEventType.CUS && !isLive;

  if (!payload.value) return null;

  const row = (
    <ControlTimelineTableItem
      payload={payload.value}
      isLive={isLive}
      onSeek={onSeek}
      onOpenContextMenu={onOpenContextMenu}
      dragControls={isReorderable ? dragControlsRef.current : undefined}
    />
  );

  return (
    <Reorder.Item
      layout="position"
      value={eventId}
      data-timeline-row
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onCommitReorder}
      style={{
        userSelect: "none",
        position: "relative",
      }}
    >
      {row}
    </Reorder.Item>
  );
});

const TimelineStaticRow = memo(function TimelineStaticRow({
  eventId,
  isLive,
  onSeek,
  onOpenContextMenu,
}: {
  eventId: number;
  isLive: boolean;
  onSeek: (id: number) => void;
  onOpenContextMenu: (e: React.MouseEvent, payload: TimelineTableItem) => void;
}) {
  const payload = useComputed(() => showModel.timelineItemsById.value[eventId]);

  if (!payload.value) return null;

  return (
    <li data-timeline-row>
      <ControlTimelineTableItem
        payload={payload.value}
        isLive={isLive}
        onSeek={onSeek}
        onOpenContextMenu={onOpenContextMenu}
      />
    </li>
  );
});

function CurrentEventScroller({ parentRef }: { parentRef: RefObject<HTMLDivElement | null> }) {
  // useSignalEffect (a React hook) re-runs whenever the tracked signals change —
  // unlike a bare .value read inside a null-returning component, which the
  // @preact/signals-react babel transform does not instrument, so the scroll
  // would otherwise never fire after the initial mount.
  useSignalEffect(() => {
    const target = playbackModel.currentCueId.value;
    const raf = requestAnimationFrame(() => scrollEventToTop(parentRef.current, target));
    return () => cancelAnimationFrame(raf);
  });

  return null;
}
