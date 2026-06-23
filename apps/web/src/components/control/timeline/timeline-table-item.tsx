import { Box, DataList, Grid, type GridProps, useToken } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import type { TimelineTableItem } from "@tgb-resolver/contracts";
import { Check } from "lucide-react";
import { MotionBox } from "@/components/motionized";
import { Tooltip } from "@/components/ui/tooltip";
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

interface ControlTimelineTableItemProps {
  payload: TimelineTableItem;
  durationInSeconds?: number;
  isCurrent?: boolean;
}

// TODO: make these items editable on some fields
export function ControlTimelineTableItem({
  payload,
  durationInSeconds,
  isCurrent,
}: ControlTimelineTableItemProps) {
  const success = useToken("colors", "green.600");
  const errror = useToken("colors", "red.500");
  const warningKeyframe = fractionalKeyframeForWarning(durationInSeconds);

  return (
    <Box
      w="full"
      h={8}
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
          <Box textAlign="end" fontFamily="mono">
            {payload.id}
          </Box>
        </Tooltip>
        <Box fontFamily="mono">{payload.type}</Box>
        <Box>
          {/* TODO: editable, available for the operator to set custom names */}
          {payload.name}
        </Box>
        <Box>{payload.problem}</Box>
        <Box textAlign="end" fontFamily="mono">
          {payload.newScore}
        </Box>
        <Box textAlign="end" fontFamily="mono">
          {payload.newRank}
        </Box>
        <Box textAlign="end" fontFamily="mono">
          {payload.triggerOffsetSeconds && payload.triggerOffsetSeconds >= 0
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

      <Tooltip content="Name for this event. Can be customized." openDelay={0}>
        <Box>Name</Box>
      </Tooltip>

      <Tooltip content="Problem name for this resolve event." openDelay={0}>
        <Box>Problem</Box>
      </Tooltip>

      <Tooltip content="New score after this resolve event." openDelay={0}>
        <Box textAlign="end">NScore</Box>
      </Tooltip>

      <Tooltip content="New rank after this resolve event." openDelay={0}>
        <Box textAlign="end">NRank</Box>
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
        <DataList.ItemLabel>CR</DataList.ItemLabel>
        <DataList.ItemValue>Contestant Resolve</DataList.ItemValue>
      </DataList.Item>

      <DataList.Item>
        <DataList.ItemLabel>PS</DataList.ItemLabel>
        <DataList.ItemValue>Play SFX</DataList.ItemValue>
      </DataList.Item>

      <DataList.Item>
        <DataList.ItemLabel>SI</DataList.ItemLabel>
        <DataList.ItemValue>Show Image</DataList.ItemValue>
      </DataList.Item>
    </DataList.Root>
  );
}
