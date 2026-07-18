import { Box, DataList, Editable, Grid, type GridProps } from "@chakra-ui/react";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { Check } from "lucide-react";
import { memo, useEffect, useState } from "react";

import { Tooltip } from "@/components/ui/tooltip";
import { useRenameControlEventMutation } from "@/features/control/hooks";

import { CurrentEventIndicator } from "./CurrentEventIndicator";
import { TIMELINE_TABLE_GRID_TEMPLATE_COLUMNS } from "./timeline-table-column.config";

function resolveDisplayName(payload: Pick<TimelineTableItem, "customName" | "placeholderName">) {
  return payload.customName && payload.customName.trim().length > 0
    ? payload.customName
    : payload.placeholderName;
}

interface ControlTimelineTableItemProps {
  payload: TimelineTableItem;
  isLive: boolean;
  onSeek: (id: number) => void;
}

export const ControlTimelineTableItem = memo(
  ({ payload, isLive, onSeek }: ControlTimelineTableItemProps) => {
    const durationInSeconds = payload.durationSeconds;

    return (
      <Box
        w="full"
        h={8}
        position="relative"
        borderBottomColor="border"
        overflow="hidden"
        data-event-id={payload.id}
      >
        <CurrentEventIndicator eventId={payload.id} durationInSeconds={durationInSeconds} />

        <ControlTimelineTableGridRow>
          <Tooltip
            content={`Seek to #${payload.id}`}
            openDelay={0}
            positioning={{ placement: "left" }}
          >
            <Box
              textAlign="end"
              fontFamily="mono"
              cursor="pointer"
              onClick={() => onSeek(payload.id)}
            >
              {payload.id}
            </Box>
          </Tooltip>
          <Box fontFamily="mono" textTransform="uppercase">
            {payload.type}
          </Box>
          <Box minW={0}>
            {!isLive ? (
              <ControlTimelineEventCustomNameEditable payload={payload} />
            ) : (
              <Box>{resolveDisplayName(payload)}</Box>
            )}
          </Box>
          <Box fontFamily="mono" overflow="hidden" textOverflow="ellipsis">
            {payload.problem ? `${payload.problem}` : ""}
            {payload.newProblemScore !== undefined ? ` (${payload.newProblemScore})` : ""}
          </Box>
          <Box textAlign="end" fontFamily="mono">
            {payload.newTotalScore}
          </Box>
          <Box textAlign="end" fontFamily="mono">
            {payload.newRank}
          </Box>
          <Box textAlign="end" fontFamily="mono">
            {payload.durationSeconds}
          </Box>
          <Box textAlign="end" fontFamily="mono">
            {payload.triggerOffsetSeconds !== undefined && payload.triggerOffsetSeconds >= 0
              ? `+${payload.triggerOffsetSeconds}`
              : payload.triggerOffsetSeconds}
          </Box>
          <Box>{payload.requireManualInteraction ? <Check size={18} /> : null}</Box>
        </ControlTimelineTableGridRow>
      </Box>
    );
  },
);

export function ControlTimelineTableHeader() {
  return (
    <ControlTimelineTableGridRow h="auto" bg="bg.subtle" py={2}>
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
    </ControlTimelineTableGridRow>
  );
}

function ControlTimelineTableGridRow({ children, ...props }: GridProps) {
  return (
    <Grid
      w="full"
      templateColumns={TIMELINE_TABLE_GRID_TEMPLATE_COLUMNS}
      gapX={2}
      h={8}
      alignItems="center"
      css={{
        "& > *": {
          zIndex: 10,
          alignItems: "center",
        },
      }}
      {...props}
    >
      {children}
    </Grid>
  );
}

function ControlTimelineEventTypeHeaderTooltip() {
  return (
    <DataList.Root>
      <DataList.Item>
        <DataList.ItemLabel>RES</DataList.ItemLabel>
        <DataList.ItemValue>Contestant Resolve</DataList.ItemValue>
      </DataList.Item>

      <DataList.Item>
        <DataList.ItemLabel>SFX</DataList.ItemLabel>
        <DataList.ItemValue>Play SFX</DataList.ItemValue>
      </DataList.Item>

      <DataList.Item>
        <DataList.ItemLabel>IMG</DataList.ItemLabel>
        <DataList.ItemValue>Show Image</DataList.ItemValue>
      </DataList.Item>

      <DataList.Item>
        <DataList.ItemLabel>PRE</DataList.ItemLabel>
        <DataList.ItemValue>Pre-Resolve (preview upcoming resolve)</DataList.ItemValue>
      </DataList.Item>
    </DataList.Root>
  );
}

interface ControlTimelineEventCustomNameEditableProps {
  payload: TimelineTableItem;
}

function ControlTimelineEventCustomNameEditable({
  payload,
}: ControlTimelineEventCustomNameEditableProps) {
  const renameEvent = useRenameControlEventMutation();

  useEffect(() => {
    setDraftName(payload.customName ?? "");
  }, [payload.customName]);

  const [draftName, setDraftName] = useState(payload.customName ?? "");

  async function commitName(nextValue: string) {
    const normalizedNextValue = nextValue.trim();
    const normalizedCurrentValue = (payload.customName ?? "").trim();

    if (normalizedNextValue === normalizedCurrentValue) {
      setDraftName(payload.customName ?? "");
      return;
    }

    await renameEvent.mutateAsync({
      eventId: payload.id,
      type: payload.type,
      customName: normalizedNextValue,
    });
  }

  return (
    <Editable.Root
      activationMode="dblclick"
      submitMode="both"
      value={draftName}
      placeholder={payload.placeholderName}
      onValueChange={({ value }) => setDraftName(value)}
      onValueCommit={({ value }) => {
        void commitName(value);
      }}
      onValueRevert={() => setDraftName(payload.customName ?? "")}
    >
      <Editable.Preview
        px={1}
        py={0.5}
        minH={6}
        borderRadius="sm"
        cursor="text"
        overflow="hidden"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
      />
      <Editable.Input px={1} py={0.5} minH={6} borderRadius="sm" bg="bg.panel" autoFocus />
    </Editable.Root>
  );
}
