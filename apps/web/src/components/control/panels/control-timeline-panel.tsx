import { Box, Button, Grid, HStack, Separator, Show, Table } from "@chakra-ui/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { TimelineEvent, TimelineResolvePayload } from "@tgb-resolver/contracts";
import { Blocks, Check, ChevronUp, File, FileDown, FileUp, Triangle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// TODO: to be obsoleted by @tgb-resolver/contracts
type Item = Omit<TimelineEvent, "payload" | "type"> & TimelineResolvePayload & { type: string };

// TODO: this example implementation is a mess, to be cleaned up

const DUMMY_ITEMS: Item[] = Array.from({ length: 10000 }, (_, i) => ({
  id: i + 1,
  type: "R",
  username: "Trần Hưng Đạo",
  problem: "A",
  newScore: 100,
  newRank: 16,
  requireManualInteraction: true,
}));

export default function ControlTimelinePanel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: DUMMY_ITEMS.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 32, // h={8}
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const [current, setCurrent] = useState(0);

  const isCurrentAtTop = virtualRows.length > 0 && virtualRows[0].index === current;

  const jumpToCurrent = () => {
    rowVirtualizer.scrollToIndex(current, {
      align: "start",
    });
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((current) => (current + 1) % DUMMY_ITEMS.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const [progress, setProgress] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: I'll find the fix later
  useEffect(() => {
    setProgress(0);
    const duration = 3600; // match your animation duration in ms
    const interval = 16; // ~60fps
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [current]);

  return (
    <Grid templateRows="1fr auto" h="full">
      <Box minH={0} position="relative">
        <Show when={!isCurrentAtTop}>
          <Button position="absolute" bottom={4} right={4} onClick={jumpToCurrent}>
            <ChevronUp />
            Jump to current
          </Button>
        </Show>

        <Box ref={scrollRef} h="full" minH={0} overflow="auto">
          <Table.Root size="sm" variant="outline" showColumnBorder stickyHeader>
            <Table.Header>
              <Table.Row bg="bg.subtle">
                <Table.ColumnHeader textAlign="end" minW="5ch" maxW="5ch">
                  No.
                </Table.ColumnHeader>
                <Table.ColumnHeader minW="5ch" maxW="5ch">
                  Type
                </Table.ColumnHeader>
                <Table.ColumnHeader minW="20ch">Name</Table.ColumnHeader>
                <Table.ColumnHeader minW="5ch">Prob.</Table.ColumnHeader>
                <Table.ColumnHeader minW="5ch" maxW="5ch">
                  Score
                </Table.ColumnHeader>
                <Table.ColumnHeader minW="5ch" maxW="5ch">
                  NRank
                </Table.ColumnHeader>
                <Table.ColumnHeader minW="4ch" maxW="4ch">
                  Trig. Off.
                </Table.ColumnHeader>
                <Table.ColumnHeader minW="4ch" maxW="4ch">
                  Manual?
                </Table.ColumnHeader>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {/* top spacer */}
              {virtualRows.length > 0 && (
                <Table.Row>
                  <Table.Cell colSpan={8} p={0} h={`${virtualRows[0].start}px`} />
                </Table.Row>
              )}

              {virtualRows.map((virtualRow) => {
                const item = DUMMY_ITEMS[virtualRow.index];

                return (
                  <Table.Row
                    key={item.id}
                    data-index={virtualRow.index}
                    css={{
                      "& > td": {
                        borderTopWidth: item.id === current ? 1 : undefined,
                        borderBottomWidth: item.id === current ? 1 : undefined,
                        borderLeftWidth: item.id === current ? 1 : undefined,
                        borderRightWidth: item.id === current ? 1 : undefined,
                        borderColor: item.id === current ? "border.success" : undefined,
                      },
                    }}
                    position="relative"
                  >
                    <Table.Cell textAlign="end">{item.id}</Table.Cell>
                    <Table.Cell>{item.type}</Table.Cell>
                    <Table.Cell>{item.username}</Table.Cell>
                    <Table.Cell>{item.problem}</Table.Cell>
                    <Table.Cell>{item.newScore}</Table.Cell>
                    <Table.Cell>{item.newRank}</Table.Cell>
                    <Table.Cell>{item.triggerDeltaSeconds}</Table.Cell>
                    <Table.Cell>
                      {item.requireManualInteraction ? <Check size={18} /> : null}
                    </Table.Cell>
                    {/* TODO: this isn't valid, find another way */}
                    {item.id === current && (
                      <Box
                        position="absolute"
                        zIndex={1}
                        top={0}
                        left={0}
                        h="full"
                        w={`${progress}%`}
                        bg="bg.success"
                        transition="width 16ms linear"
                        pointerEvents="none"
                      />
                    )}
                  </Table.Row>
                );
              })}

              {/* bottom spacer */}
              {virtualRows.length > 0 && (
                <Table.Row>
                  <Table.Cell
                    colSpan={8}
                    p={0}
                    h={`${rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end}px`}
                  />
                </Table.Row>
              )}
            </Table.Body>
          </Table.Root>
        </Box>
      </Box>

      <HStack h={16} alignItems="center" borderTopWidth={1} gap={2} p={2}>
        <Button>
          <FileDown />
          Save
        </Button>

        <Button>
          <FileUp />
          Load
        </Button>

        <Button>
          <Blocks />
          Optimzie
        </Button>
      </HStack>
    </Grid>
  );
}
