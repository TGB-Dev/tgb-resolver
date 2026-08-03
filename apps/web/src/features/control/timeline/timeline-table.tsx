import { Box, Center, Spinner, Text } from "@chakra-ui/react";
import { useComputed, useSignalEffect } from "@preact/signals-react";
import { For } from "@preact/signals-react/utils";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { Reorder, useDragControls } from "motion/react";
import { memo, type RefObject, useCallback, useRef } from "react";

import {
  useControlIsLive,
  useControlShowQuery,
  useControlShowRows,
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

function scrollEventToTop(parent: HTMLDivElement | null, currentEventId: number | null) {
  if (!parent || currentEventId == null) return;
  const el = parent.querySelector<HTMLElement>(`[data-event-id="${currentEventId}"]`);
  if (!el) return;
  animateScrollIntoView(el, parent, { block: "start", duration: 0.15 });
}

export function ControlTimelineTable({ apiRef }: ControlTimelineTableProps) {
  const showQuery = useControlShowQuery();
  const rows = useControlShowRows();
  const isLive = useControlIsLive();
  const seekPlayback = useSeekPlaybackMutation();
  const moveEvent = useMoveTimelineEventMutation();
  const timelineContextMenu = useTimelineRowContextMenu();
  const onSeek = useCallback((id: number) => seekPlayback.mutate(id), [seekPlayback.mutate]);
  const parentRef = useRef<HTMLDivElement>(null);
  const movePendingRef = useRef(false);
  const reorderSnapshotRef =
    useRef<ReturnType<typeof showModel.optimisticallyReorderTimeline>>(null);

  const commitReorder = useCallback(
    (newRows: TimelineTableItem[]) => {
      const initialOrderedIds = showModel.showOrderedIds.peek();
      // Find the row that changed position
      let movedItem: TimelineTableItem | null = null;
      let targetIndex = -1;

      for (let i = 0; i < newRows.length; i++) {
        if (newRows[i].id !== initialOrderedIds[i]) {
          // Check if this item is a CUS event (only CUS events can be moved)
          if (newRows[i].type === TimelineEventType.CUS) {
            movedItem = newRows[i];
            targetIndex = i;
            break;
          }
        }
      }

      if (!movedItem || targetIndex < 0) return;

      // Determine relative destination
      const before = targetIndex === 0;
      const relativeToEventId = before ? newRows[1]?.id : newRows[targetIndex - 1]?.id;

      if (relativeToEventId != null) {
        const snapshot = showModel.optimisticallyReorderTimeline(newRows.map((row) => row.id));
        const expectedOrderedIds = showModel.showOrderedIds.peek();
        reorderSnapshotRef.current = snapshot;
        movePendingRef.current = true;
        moveEvent.mutate(
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
    },
    [moveEvent],
  );

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

  if (rows.length === 0) {
    return (
      <Center boxSize="full">
        <Text>No show loaded.</Text>
      </Center>
    );
  }

  return (
    <Box boxSize="full" display="flex" flexDir="column" minH={0} overflow="hidden">
      <ControlTimelineTableHeader />

      <Box flex={1} minH={0} ref={parentRef} overflow="auto">
        <CurrentEventScroller parentRef={parentRef} />
        <TimelineReorderList
          rows={rows}
          isLive={isLive}
          onSeek={onSeek}
          onOpenContextMenu={timelineContextMenu.open}
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
  rows,
  isLive,
  onSeek,
  onOpenContextMenu,
  onCommitReorder,
  isMovePending,
}: {
  rows: TimelineTableItem[];
  isLive: boolean;
  onSeek: (id: number) => void;
  onOpenContextMenu: (e: React.MouseEvent, payload: TimelineTableItem) => void;
  onCommitReorder: (rows: TimelineTableItem[]) => void;
  isMovePending: RefObject<boolean>;
}) {
  const reorderStateRef = useRef<ReturnType<typeof createTimelineReorderState>>(null);
  if (!reorderStateRef.current) reorderStateRef.current = createTimelineReorderState();
  const reorderState = reorderStateRef.current;
  const displayRows = reorderState.rows.value ?? rows;

  return (
    <Reorder.Group
      axis="y"
      values={displayRows}
      onReorder={(nextRows) => {
        if (!isMovePending.current) reorderState.set(nextRows);
      }}
      style={{ listStyle: "none", padding: 0, margin: 0 }}
    >
      <For each={displayRows}>
        {(payload) => (
          <TimelineRowItem
            key={payload.id}
            payload={payload}
            isLive={isLive}
            onSeek={onSeek}
            onOpenContextMenu={onOpenContextMenu}
            onCommitReorder={() => {
              const nextRows = reorderState.take();
              if (nextRows && !isMovePending.current) onCommitReorder(nextRows);
            }}
          />
        )}
      </For>
    </Reorder.Group>
  );
}

const TimelineRowItem = memo(function TimelineRowItem({
  payload,
  isLive,
  onSeek,
  onOpenContextMenu,
  onCommitReorder,
}: {
  payload: TimelineTableItem;
  isLive: boolean;
  onSeek: (id: number) => void;
  onOpenContextMenu: (e: React.MouseEvent, payload: TimelineTableItem) => void;
  onCommitReorder: () => void;
}) {
  const dragControls = useDragControls();
  const isCurrent = useComputed(() => playbackModel.currentCueId.value === payload.id);
  const isReorderable = payload.type === TimelineEventType.CUS && !isLive;

  const row = (
    <ControlTimelineTableItem
      payload={payload}
      isCurrent={isCurrent.value}
      isLive={isLive}
      onSeek={onSeek}
      onOpenContextMenu={onOpenContextMenu}
      dragControls={isReorderable ? dragControls : undefined}
    />
  );

  return (
    <Reorder.Item
      value={payload}
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
