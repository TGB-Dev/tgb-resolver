import { Box, Center, Spinner, Text } from "@chakra-ui/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";

import { useControlShowQuery, useControlShowRows } from "@/features/control/hooks";
import { CONTROL_TIMELINE_ROW_HEIGHT_PX } from "@/state/list-metrics";

import { ControlTimelineTableHeader, ControlTimelineTableItem } from "./timeline-table-item";

export interface ControlTimelineTableHandle {
  scrollToCurrent: () => void;
}

interface ControlTimelineTableProps {
  apiRef?: { current: ControlTimelineTableHandle | null };
}

export function ControlTimelineTable({ apiRef }: ControlTimelineTableProps) {
  const showQuery = useControlShowQuery();
  const rows = useControlShowRows();
  const currentEventId = showQuery.data?.playback.currentEventId;
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CONTROL_TIMELINE_ROW_HEIGHT_PX,
    overscan: 10,
  });

  // Auto-scroll to current event — tested manually across devices/browsers.
  // rows ref changes when data updates; virtualizer reference is stable.
  useEffect(() => {
    if (currentEventId == null) return;
    const index = rows.findIndex((r) => r.id === currentEventId);
    if (index >= 0) {
      virtualizer.scrollToIndex(index, { align: "start" });
    }
  }, [currentEventId, rows, virtualizer]);

  if (apiRef) {
    apiRef.current = {
      scrollToCurrent: () => {
        if (currentEventId == null) return;
        const index = rows.findIndex((r) => r.id === currentEventId);
        if (index >= 0) {
          virtualizer.scrollToIndex(index, { align: "start" });
        }
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
        <Box h={`${virtualizer.getTotalSize()}px`} w="full" position="relative">
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = rows[virtualRow.index];
            return (
              <Box
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                position="absolute"
                top={0}
                left={0}
                w="full"
                transform={`translateY(${virtualRow.start}px)`}
              >
                <ControlTimelineTableItem
                  payload={item}
                  isCurrent={item.id === currentEventId}
                  durationInSeconds={item.durationSeconds}
                />
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
