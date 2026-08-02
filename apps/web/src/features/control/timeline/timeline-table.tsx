import { Box, Center, Spinner, Text } from "@chakra-ui/react";
import { useSignalEffect } from "@preact/signals-react";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { Reorder, useDragControls } from "motion/react";
import { type RefObject, useCallback, useRef } from "react";

import {
  useControlIsLive,
  useControlShowQuery,
  useControlShowRows,
  useMoveTimelineEventMutation,
  useSeekPlaybackMutation,
} from "@/features/control/hooks";
import { playbackModel } from "@/features/control/playback-model";
import { animateScrollIntoView } from "@/features/leaderboard/utils/scroll";

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

  const handleReorder = useCallback(
    (newRows: TimelineTableItem[]) => {
      // Find the row that changed position
      let movedItem: TimelineTableItem | null = null;
      let targetIndex = -1;

      for (let i = 0; i < newRows.length; i++) {
        if (newRows[i].id !== rows[i]?.id) {
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
        moveEvent.mutate({
          eventId: movedItem.id,
          relativeToEventId,
          before,
        });
      }
    },
    [rows, moveEvent],
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
        <Reorder.Group
          axis="y"
          values={rows}
          onReorder={handleReorder}
          style={{ listStyle: "none", padding: 0, margin: 0 }}
        >
          {rows.map((payload) => (
            <TimelineRowItem
              key={payload.id}
              payload={payload}
              isCurrent={playbackModel.currentCueId.value === payload.id}
              isLive={isLive}
              onSeek={onSeek}
              onOpenContextMenu={timelineContextMenu.open}
            />
          ))}
        </Reorder.Group>
      </Box>
      <TimelineRowContextMenu
        state={timelineContextMenu.state}
        onClose={timelineContextMenu.close}
      />
    </Box>
  );
}

function TimelineRowItem({
  payload,
  isCurrent,
  isLive,
  onSeek,
  onOpenContextMenu,
}: {
  payload: TimelineTableItem;
  isCurrent: boolean;
  isLive: boolean;
  onSeek: (id: number) => void;
  onOpenContextMenu: (e: React.MouseEvent, payload: TimelineTableItem) => void;
}) {
  const dragControls = useDragControls();
  const isReorderable = payload.type === TimelineEventType.CUS && !isLive;

  return (
    <Reorder.Item
      value={payload}
      dragListener={false}
      dragControls={dragControls}
      style={{
        userSelect: "none",
        position: "relative",
      }}
    >
      <ControlTimelineTableItem
        payload={payload}
        isCurrent={isCurrent}
        isLive={isLive}
        onSeek={onSeek}
        onOpenContextMenu={onOpenContextMenu}
        dragControls={isReorderable ? dragControls : undefined}
      />
    </Reorder.Item>
  );
}

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
