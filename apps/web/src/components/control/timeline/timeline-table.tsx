import { Box, Center, Spinner, Text } from "@chakra-ui/react";
import { useEffect, useRef } from "react";

import { useControlShowQuery } from "@/features/control/hooks";

import { ControlTimelineTableHeader, ControlTimelineTableItem } from "./timeline-table-item";

export interface ControlTimelineTableHandle {
  scrollToCurrent: () => void;
}

interface ControlTimelineTableProps {
  apiRef?: { current: ControlTimelineTableHandle | null };
}

export function ControlTimelineTable({ apiRef }: ControlTimelineTableProps) {
  const showQuery = useControlShowQuery();
  const currentEventId = showQuery.data?.playback.currentEventId;
  const events = showQuery.data?.timeline ?? [];
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentEventId == null) return;
    const el = parentRef.current?.querySelector(`[data-event-id="${currentEventId}"]`);
    el?.scrollIntoView({ block: "start" });
  }, [currentEventId]);

  if (apiRef) {
    apiRef.current = {
      scrollToCurrent: () => {
        if (currentEventId == null) return;
        const el = parentRef.current?.querySelector(`[data-event-id="${currentEventId}"]`);
        el?.scrollIntoView({ block: "start" });
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

  if (events.length === 0) {
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
        {events.map((event) => (
          <ControlTimelineTableItem key={event.id} eventId={event.id} />
        ))}
      </Box>
    </Box>
  );
}
