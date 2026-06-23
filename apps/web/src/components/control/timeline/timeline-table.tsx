import { Box } from "@chakra-ui/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ShortenedTimelineEventType,
  type TimelineEventType,
  type TimelineTableItem,
  toShortenedTimelineEventType,
} from "@tgb-resolver/contracts";
import { useEffect, useRef, useState } from "react";
import { ControlTimelineTableHeader, ControlTimelineTableItem } from "./timeline-table-item";

// TODO: Replace with real data and real store later on
const DUMMY_ITEMS: TimelineTableItem[] = Array.from({ length: 10000 }, (_, i) => {
  const type = (i % 3) as TimelineEventType;
  const shortenedType = toShortenedTimelineEventType[type];

  if (shortenedType === ShortenedTimelineEventType.CR) {
    return {
      id: i + 1,
      type: shortenedType,
      name: "Trần Hưng Đạo",
      problem: "A",
      newScore: 100,
      newRank: 16,
      requireManualInteraction: true,
    };
  } else if (shortenedType === ShortenedTimelineEventType.PS) {
    return {
      id: i + 1,
      type: shortenedType,
      name: "SFX",
    };
  } else if (shortenedType === ShortenedTimelineEventType.SI) {
    return {
      id: i + 1,
      type: shortenedType,
      name: "Image",
    };
  } else {
    return {
      id: i + 1,
      type: shortenedType,
      name: "Unknown",
    };
  }
});

const DUMMY_ANIMATION_DURATION_MS = 10000;

export function ControlTimelineTable() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: DUMMY_ITEMS.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 32, // h={8}
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  // Dummy current playing index
  const [current, setCurrent] = useState(0);

  // Dummy timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((current) => (current + 1) % DUMMY_ITEMS.length);
    }, DUMMY_ANIMATION_DURATION_MS);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (current) {
      rowVirtualizer.scrollToIndex(current, {
        align: "start",
      });
    }
  }, [rowVirtualizer, current]);

  return (
    <Box boxSize="full" display="flex" flexDir="column" minH={0} overflow="hidden">
      <ControlTimelineTableHeader />

      <Box ref={scrollRef} flex={1} minH={0} overflowY="auto">
        <Box position="relative" h={rowVirtualizer.getTotalSize()} w="full">
          {virtualRows.map((virtualRow) => {
            const item = DUMMY_ITEMS[virtualRow.index];
            const isCurrent = virtualRow.index === current;

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
                  durationInSeconds={DUMMY_ANIMATION_DURATION_MS / 1000}
                />
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
