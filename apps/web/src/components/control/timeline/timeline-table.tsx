import { Box, Center, Spinner, Text } from "@chakra-ui/react";
import { type RefObject, useCallback, useEffect, useRef } from "react";

import {
  useControlIsLive,
  useControlShowQuery,
  useSeekPlaybackMutation,
} from "@/features/control/hooks";
import { rowsSignal } from "@/features/control/show-store";
import { playbackSignal } from "@/models/playback-state";

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
  parent.scrollTop += el.getBoundingClientRect().top - parent.getBoundingClientRect().top;
}

export function ControlTimelineTable({ apiRef }: ControlTimelineTableProps) {
  const showQuery = useControlShowQuery();
  const rows = rowsSignal.value;
  const isLive = useControlIsLive();
  const seekPlayback = useSeekPlaybackMutation();
  const onSeek = useCallback((id: number) => seekPlayback.mutate(id), [seekPlayback.mutate]);
  const parentRef = useRef<HTMLDivElement>(null);

  if (apiRef) {
    apiRef.current = {
      scrollToCurrent: () => {
        scrollEventToTop(parentRef.current, playbackSignal.peek().currentEventId);
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
        {rows.map((payload) => (
          <ControlTimelineTableItem
            key={payload.id}
            payload={payload}
            isLive={isLive}
            onSeek={onSeek}
          />
        ))}
      </Box>
    </Box>
  );
}

function CurrentEventScroller({ parentRef }: { parentRef: RefObject<HTMLDivElement | null> }) {
  const currentEventId = playbackSignal.value.currentEventId;

  useEffect(() => {
    scrollEventToTop(parentRef.current, currentEventId);
  }, [currentEventId, parentRef]);

  return null;
}
