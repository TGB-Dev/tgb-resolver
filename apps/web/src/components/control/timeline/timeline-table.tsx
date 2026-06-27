import { Box, Center, Spinner, Text } from "@chakra-ui/react";
import type { TimelineTableItem } from "@tgb-resolver/contracts";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { List, type RowComponentProps } from "react-window";

import {
  connectControlAtom,
  controlCurrentEventIdAtom,
  controlErrorAtom,
  controlLoadingAtom,
  controlRowsAtom,
  disconnectControlAtom,
} from "@/state/control";
import { CONTROL_TIMELINE_ROW_HEIGHT_PX } from "@/state/list-metrics";

import { ControlTimelineTableHeader, ControlTimelineTableItem } from "./timeline-table-item";

export function ControlTimelineTable() {
  const rows = useAtomValue(controlRowsAtom);
  const loading = useAtomValue(controlLoadingAtom);
  const error = useAtomValue(controlErrorAtom);
  const currentEventId = useAtomValue(controlCurrentEventIdAtom);
  const connect = useSetAtom(connectControlAtom);
  const disconnect = useSetAtom(disconnectControlAtom);

  useEffect(() => {
    void connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

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
        <Box flex={1} minH={0}>
          <List
            rowCount={rows.length}
            rowHeight={CONTROL_TIMELINE_ROW_HEIGHT_PX}
            rowComponent={TimelineRow}
            rowProps={{ rows, currentEventId }}
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
