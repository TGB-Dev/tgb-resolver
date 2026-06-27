import { Box, DataList, Editable, Grid, type GridProps, useToken } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import type { TimelineTableItem } from "@tgb-resolver/contracts";
import { useAtomValue, useSetAtom } from "jotai";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";

import { MotionBox } from "@/components/motionized";
import { Tooltip } from "@/components/ui/tooltip";
import { controlIsLiveAtom, renameControlEventAtom } from "@/state/control";
import { CONTROL_TIMELINE_ROW_HEIGHT_PX, pxToChakraSpace } from "@/state/list-metrics";

import { TIMELINE_TABLE_GRID_TEMPLATE_COLUMNS } from "./timeline-table-column.config";

const SECONDS_BEFORE_WARNING = 2;

const pulseBorder = keyframes`
  0%, 100% {
    border-color: var(--chakra-colors-border-success);
  }

  50% {
    border-color: var(--chakra-colors-border);
  }
`;

function fractionalKeyframeForWarning(durationInSeconds?: number) {
  return durationInSeconds && durationInSeconds > SECONDS_BEFORE_WARNING
    ? (durationInSeconds - SECONDS_BEFORE_WARNING) / durationInSeconds
    : 0;
}

function resolveDisplayName(payload: Pick<TimelineTableItem, "customName" | "placeholderName">) {
  return payload.customName && payload.customName.trim().length > 0
    ? payload.customName
    : payload.placeholderName;
}

interface ControlTimelineTableItemProps {
  payload: TimelineTableItem;
  durationInSeconds?: number;
  isCurrent?: boolean;
}

export function ControlTimelineTableItem({
  payload,
  durationInSeconds,
  isCurrent,
}: ControlTimelineTableItemProps) {
  const success = useToken("colors", "green.600");
  const errror = useToken("colors", "red.500");
  const warningKeyframe = fractionalKeyframeForWarning(durationInSeconds);
  const isLive = useAtomValue(controlIsLiveAtom);

  return (
    <Box
      w="full"
      h={pxToChakraSpace(CONTROL_TIMELINE_ROW_HEIGHT_PX)}
      position="relative"
      borderWidth={2}
      borderColor={isCurrent ? "border.success" : "transparent"}
      borderBottomColor="border"
      animation={isCurrent ? `${pulseBorder} 1s infinite` : undefined}
    >
      <MotionBox
        position="absolute"
        zIndex={0}
        top={0}
        left={0}
        h="full"
        initial={{
          width: "0%",
          backgroundColor: success,
        }}
        animate={
          isCurrent
            ? {
                width: "100%",
                backgroundColor: [success[0], success[0], errror[0]],
              }
            : {
                width: "0%",
                backgroundColor: success,
              }
        }
        transition={{
          width: {
            duration: durationInSeconds,
            ease: "linear",
          },
          backgroundColor: {
            duration: durationInSeconds,
            times: [
              0,
              warningKeyframe,
              warningKeyframe, // immediate jump
            ],
            ease: "linear",
          },
        }}
        pointerEvents="none"
      />

      <ControlTimelineTableGridRow>
        <Tooltip
          content={`Seek to #${payload.id}`}
          openDelay={0}
          positioning={{ placement: "left" }}
        >
          <Box textAlign="end" fontFamily="mono" cursor="pointer">
            {payload.id}
          </Box>
        </Tooltip>
        <Box fontFamily="mono">{payload.type}</Box>
        <Box minW={0}>
          {!isLive ? (
            <ControlTimelineEventCustomNameEditable payload={payload} />
          ) : (
            <Box>{resolveDisplayName(payload)}</Box>
          )}
        </Box>
        <Box fontFamily="mono">{payload.problem}</Box>
        <Box textAlign="end" fontFamily="mono">
          {payload.newScore}
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
}

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

      <Tooltip content="Problem name for this resolve event." openDelay={0}>
        <Box>Prob.</Box>
      </Tooltip>

      <Tooltip content="New score after this resolve event." openDelay={0}>
        <Box textAlign="end">NScore</Box>
      </Tooltip>

      <Tooltip content="New rank after this resolve event." openDelay={0}>
        <Box textAlign="end">NRank</Box>
      </Tooltip>

      <Tooltip content="Duration in seconds. Cannot be negative." openDelay={0}>
        <Box textAlign="end">Dur.</Box>
      </Tooltip>

      <Tooltip content="Trigger offset in seconds. Can be negative." openDelay={0}>
        <Box textAlign="end">Trig. Off.</Box>
      </Tooltip>

      <Tooltip content="Whether this event requires manual interaction to proceed." openDelay={0}>
        <Box>Man.?</Box>
      </Tooltip>
    </ControlTimelineTableGridRow>
  );
}

export function ControlTimelineTableBlankItem() {
  return <ControlTimelineTableGridRow>{/* blank */}</ControlTimelineTableGridRow>;
}

function ControlTimelineTableGridRow({ children, ...props }: GridProps) {
  return (
    <Grid
      w="full"
      templateColumns={TIMELINE_TABLE_GRID_TEMPLATE_COLUMNS}
      gapX={2}
      h={pxToChakraSpace(CONTROL_TIMELINE_ROW_HEIGHT_PX)}
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
    </DataList.Root>
  );
}

interface ControlTimelineEventCustomNameEditableProps {
  payload: TimelineTableItem;
}

function ControlTimelineEventCustomNameEditable({
  payload,
}: ControlTimelineEventCustomNameEditableProps) {
  const renameEvent = useSetAtom(renameControlEventAtom);

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

    await renameEvent({
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
