import { Box, Center, Spinner, Text } from "@chakra-ui/react";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { List, type RowComponentProps } from "react-window";

import { useControlShowQuery, useControlShowRows } from "@/features/control/hooks";
import { CONTROL_TIMELINE_ROW_HEIGHT_PX } from "@/state/list-metrics";

import { ControlTimelineTableHeader, ControlTimelineTableItem } from "./timeline-table-item";

export function ControlTimelineTable() {
  const showQuery = useControlShowQuery();
  const rows = useControlShowRows();
  const currentEventId = showQuery.data?.playback.currentEventId;

  return (
    <Box boxSize="full" display="flex" flexDir="column" minH={0} overflow="hidden">
      <ControlTimelineTableHeader />

      {showQuery.isLoading ? (
        <Center flex={1}>
          <Spinner />
        </Center>
      ) : showQuery.error ? (
        <Center flex={1} px={4}>
          <Text>{showQuery.error.message}</Text>
        </Center>
      ) : rows.length === 0 ? (
        <Center flex={1}>
          <Text>No show loaded.</Text>
        </Center>
      ) : (
        <Box flex={1} minH={0}>
          <List
            rowCount={rows.length}
            rowHeight={CONTROL_TIMELINE_ROW_HEIGHT_PX}
            rowComponent={TimelineRow}
            rowProps={{ rows, currentEventId: currentEventId ?? undefined }}
            overscanCount={10}
            style={{ height: "100%" }}
          />
        </Box>
      )}
    </Box>
  );
}

interface TimelineRowProps {
  rows: TimelineTableItem[];
  currentEventId?: number;
}

function TimelineRow({ index, style, rows, currentEventId }: RowComponentProps<TimelineRowProps>) {
  const item = rows[index];

  return (
    <Box style={style}>
      <ControlTimelineTableItem
        payload={item}
        isCurrent={item.id === currentEventId}
        durationInSeconds={item.durationSeconds}
      />
    </Box>
  );
}
