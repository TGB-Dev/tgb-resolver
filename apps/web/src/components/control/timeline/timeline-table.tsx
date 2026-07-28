import { Box, Center, Spinner, Text } from "@chakra-ui/react";
import { useSignalEffect } from "@preact/signals-react";
import { type RefObject, useCallback, useRef } from "react";

import {
  useControlIsLive,
  useControlShowQuery,
  useControlShowRows,
  useSeekPlaybackMutation,
} from "@/features/control/hooks";
import { playbackModel } from "@/models";

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
  el.scrollIntoView({ block: "start", behavior: "auto" });
}

export function ControlTimelineTable({ apiRef }: ControlTimelineTableProps) {
  const showQuery = useControlShowQuery();
  const rows = useControlShowRows();
  const isLive = useControlIsLive();
  const seekPlayback = useSeekPlaybackMutation();
  const onSeek = useCallback((id: number) => seekPlayback.mutate(id), [seekPlayback.mutate]);
  const parentRef = useRef<HTMLDivElement>(null);

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
        {rows.map((payload) => (
          <ControlTimelineTableItem
            key={payload.id}
            payload={payload}
            isCurrent={playbackModel.currentCueId.value === payload.id}
            isLive={isLive}
            onSeek={onSeek}
          />
        ))}
      </Box>
    </Box>
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
