import { Box, DataList } from "@chakra-ui/react";
import { For } from "@preact/signals-react/utils";

import { extensionRegistry } from "@/features/extensions";
import { GridTableRow } from "@/features/shared/ui/grid-table";
import { Tooltip } from "@/features/shared/ui/tooltip";

import {
  TIMELINE_TABLE_GRID_TEMPLATE_COLUMNS,
  TIMELINE_TABLE_GRID_TEMPLATE_COLUMNS_STATIC,
} from "./timeline-table-column.config";

export interface ControlTimelineTableHeaderProps {
  isLive: boolean;
}

function ControlTimelineEventTypeHeaderTooltip() {
  return (
    <DataList.Root>
      <DataList.Item>
        <DataList.ItemLabel>RES</DataList.ItemLabel>
        <DataList.ItemValue>Contestant Resolve</DataList.ItemValue>
      </DataList.Item>

      <DataList.Item>
        <DataList.ItemLabel>PRE</DataList.ItemLabel>
        <DataList.ItemValue>Pre-Resolve (preview upcoming resolve)</DataList.ItemValue>
      </DataList.Item>

      <DataList.Item>
        <DataList.ItemLabel>UNK</DataList.ItemLabel>
        <DataList.ItemValue>Unknown</DataList.ItemValue>
      </DataList.Item>

      <For each={extensionRegistry.extensionList}>
        {(extension) => (
          <DataList.Item key={extension.extId}>
            <DataList.ItemLabel>{extension.shortName}</DataList.ItemLabel>
            <DataList.ItemValue>{extension.description}</DataList.ItemValue>
          </DataList.Item>
        )}
      </For>
    </DataList.Root>
  );
}

export function ControlTimelineTableHeader({ isLive }: ControlTimelineTableHeaderProps) {
  return (
    <GridTableRow
      templateColumns={
        isLive ? TIMELINE_TABLE_GRID_TEMPLATE_COLUMNS_STATIC : TIMELINE_TABLE_GRID_TEMPLATE_COLUMNS
      }
      h="auto"
      bg="bg.subtle"
      py={2}
    >
      <Tooltip content="Event ID" openDelay={0}>
        <Box textAlign="end">No.</Box>
      </Tooltip>

      <Tooltip content={<ControlTimelineEventTypeHeaderTooltip />} openDelay={0}>
        <Box>Type</Box>
      </Tooltip>

      <Tooltip content="Name for this event. Double-click to customize." openDelay={0}>
        <Box>Name</Box>
      </Tooltip>

      <Tooltip content="Problem name and score for this resolve event." openDelay={0}>
        <Box>Prob.</Box>
      </Tooltip>

      <Tooltip content="New total team score after this resolve event." openDelay={0}>
        <Box textAlign="end">NScore</Box>
      </Tooltip>

      <Tooltip content="New rank after this resolve event." openDelay={0}>
        <Box textAlign="end">NRank</Box>
      </Tooltip>

      <Tooltip content="Duration in seconds. Cannot be negative." openDelay={0}>
        <Box textAlign="end">Dur.</Box>
      </Tooltip>

      <Tooltip
        content="Trigger offset from the start of previous event in seconds. Can be negative."
        openDelay={0}
      >
        <Box textAlign="end">Trig. Off.</Box>
      </Tooltip>

      <Tooltip content="Whether this event requires manual interaction to proceed." openDelay={0}>
        <Box>Man.?</Box>
      </Tooltip>

      {!isLive ? <Box /> : null}
    </GridTableRow>
  );
}
