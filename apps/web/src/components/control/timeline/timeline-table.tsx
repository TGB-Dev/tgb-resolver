import { Box, Center, Spinner, Text } from "@chakra-ui/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";
import { useControlStore } from "@/stores/control.store";
import { ControlTimelineTableHeader, ControlTimelineTableItem } from "./timeline-table-item";

export function ControlTimelineTable() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { rows, loading, error, loadShow, connect, show } = useControlStore();

  useEffect(() => {
    void loadShow();
    void connect();
  }, [loadShow, connect]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 32,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const currentEventId = show?.playback.currentEventId;

  return (
    <Box boxSize="full" display="flex" flexDir="column" minH={0} overflow="hidden">
      <ControlTimelineTableHeader />

      {loading ? (
        <Center flex={1}>
          <Spinner />
        </Center>
      ) : error ? (
        <Center flex={1} px={4}>
          <Text>{error}</Text>
        </Center>
      ) : rows.length === 0 ? (
        <Center flex={1}>
          <Text>No show loaded.</Text>
        </Center>
      ) : (
        <Box ref={scrollRef} flex={1} minH={0} overflowY="auto">
          <Box position="relative" h={rowVirtualizer.getTotalSize()} w="full">
            {virtualRows.map((virtualRow) => {
              const item = rows[virtualRow.index];
              const isCurrent = item.id === currentEventId;

              return (
                <Box
                  key={item.id}
                  position="absolute"
                  top={0}
                  left={0}
                  width="full"
                  transform={`translateY(${virtualRow.start}px)`}
                >
                  <ControlTimelineTableItem
                    payload={item}
                    isCurrent={isCurrent}
                    durationInSeconds={item.durationSeconds}
                  />
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}
