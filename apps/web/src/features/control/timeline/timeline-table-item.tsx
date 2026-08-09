import { Box, IconButton } from "@chakra-ui/react";
import { useSignal } from "@preact/signals-react";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { Check, GripVertical } from "lucide-react";
import { memo, useCallback } from "react";

import { floatingPanelModel } from "@/features/control/floating-panel-model";
import { FloatingPanelType } from "@/features/control/floating-panel-types";
import { extensionRegistry } from "@/features/extensions";
import { TgbResolverCssEasings } from "@/features/shared/anim/easings";
import { showModel } from "@/features/shared/show-model";
import { GridTableRow } from "@/features/shared/ui/grid-table";

import { CurrentEventIndicator } from "./current-event-indicator";
import { TimelineAddButtons } from "./timeline-add-buttons";
import { ControlTimelineEventCustomNameEditable } from "./timeline-custom-name-editable";
import { TimelineEventPosition } from "./timeline-event-position";
import { ControlTimelineManualInteraction } from "./timeline-manual-interaction";
import { ControlTimelineNumberEditable } from "./timeline-number-editable";
import {
  TIMELINE_TABLE_GRID_TEMPLATE_COLUMNS,
  TIMELINE_TABLE_GRID_TEMPLATE_COLUMNS_STATIC,
} from "./timeline-table-column.config";

export { ControlTimelineTableHeader } from "./timeline-table-header";

export interface ControlTimelineTableItemProps {
  payload: TimelineTableItem;
  isLive: boolean;
  onSeek: (id: number) => void;
  onOpenContextMenu?: (e: React.MouseEvent, payload: TimelineTableItem) => void;
  dragHandleRef?: (element: Element | null) => void;
  onCreateEvent?: (relativeToEventId: number, before: boolean) => void;
}

function resolveDisplayName(payload: Pick<TimelineTableItem, "customName" | "placeholderName">) {
  return payload.customName && payload.customName.trim().length > 0
    ? payload.customName
    : payload.placeholderName;
}

function getTimelinePosition(eventId: number, fallback: number) {
  const index = showModel.showOrderedIds.peek().indexOf(eventId);
  return index < 0 ? fallback : index + 1;
}

export const ControlTimelineTableItem = memo(
  ({
    payload,
    isLive,
    onSeek,
    onOpenContextMenu,
    dragHandleRef,
    onCreateEvent,
  }: ControlTimelineTableItemProps) => {
    const isNear = useSignal(false);
    const durationInSeconds = payload.durationSeconds;
    const isReorderable = payload.type === TimelineEventType.CUS && !isLive;
    const templateColumns = isLive
      ? TIMELINE_TABLE_GRID_TEMPLATE_COLUMNS_STATIC
      : TIMELINE_TABLE_GRID_TEMPLATE_COLUMNS;
    const type =
      payload.type !== TimelineEventType.CUS
        ? payload.type
        : !payload.extId
          ? "UNK"
          : extensionRegistry.extensionWithExtId(payload.extId)?.shortName || "UNK";

    const handleCreate = useCallback(
      (before: boolean) => {
        const position = getTimelinePosition(payload.id, payload.position);
        if (onCreateEvent) {
          onCreateEvent(payload.id, before);
        } else {
          floatingPanelModel.openFloatingPanel(
            FloatingPanelType.CreateEvent,
            `Create Event (${before ? "Before" : "After"} #${position})`,
            { relativeToEventId: payload.id, before },
          );
        }
      },
      [onCreateEvent, payload.id, payload.position],
    );

    const handlePointerEnter = useCallback(() => {
      isNear.value = true;
    }, [isNear]);

    const handlePointerLeave = useCallback(() => {
      isNear.value = false;
    }, [isNear]);

    const handleContextMenu = useCallback(
      (e: React.MouseEvent) => {
        onOpenContextMenu?.(e, payload);
      },
      [onOpenContextMenu, payload],
    );

    const handleDoubleClick = useCallback(() => {
      if (payload.type === TimelineEventType.CUS) {
        const position = getTimelinePosition(payload.id, payload.position);
        floatingPanelModel.openFloatingPanel(
          FloatingPanelType.ExtensionConfig,
          `Edit Event #${position}`,
          { eventId: payload.id },
        );
      }
    }, [payload.id, payload.position, payload.type]);

    return (
      <Box
        w="full"
        minH={8}
        position="relative"
        borderBottomColor="border"
        data-event-id={payload.id}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
        css={{
          "& .add-btn-wrapper": {
            opacity: 0,
            transition: `opacity 0.15s ${TgbResolverCssEasings.swiftOut}`,
            pointerEvents: "none",
          },
          "&:hover .add-btn-wrapper": { opacity: 1, pointerEvents: "auto" },
        }}
      >
        <CurrentEventIndicator eventId={payload.id} durationInSeconds={durationInSeconds} />

        <GridTableRow templateColumns={templateColumns}>
          <TimelineEventPosition
            eventId={payload.id}
            fallbackPosition={payload.position}
            onSeek={onSeek}
          />
          <Box fontFamily="mono" textTransform="uppercase">
            {type}
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
          {!isLive ? (
            <ControlTimelineNumberEditable payload={payload} field="durationSeconds" />
          ) : (
            <Box textAlign="end" fontFamily="mono">
              {payload.durationSeconds}
            </Box>
          )}
          {!isLive ? (
            <ControlTimelineNumberEditable payload={payload} field="triggerOffsetSeconds" />
          ) : (
            <Box textAlign="end" fontFamily="mono">
              {payload.triggerOffsetSeconds != null && payload.triggerOffsetSeconds > 0
                ? `+${payload.triggerOffsetSeconds}`
                : ""}
            </Box>
          )}

          <Box display="flex" alignItems="center" justifyContent="center" h={6} m={1}>
            {!isLive ? (
              <ControlTimelineManualInteraction payload={payload} isNear={isNear.value} />
            ) : (
              <>{payload.requireManualInteraction ? <Check size={14} /> : null}</>
            )}
          </Box>

          {!isLive ? (
            <Box display="flex" alignItems="center" justifyContent="center" h="full">
              <IconButton
                aria-label="Drag to reorder event"
                ref={dragHandleRef}
                size="2xs"
                variant="ghost"
                disabled={!isReorderable}
                cursor={isReorderable ? "grab" : "not-allowed"}
                _active={{ cursor: isReorderable ? "grabbing" : "not-allowed" }}
                color="fg.muted"
                _hover={isReorderable ? { color: "fg" } : undefined}
              >
                <GripVertical size={14} />
              </IconButton>
            </Box>
          ) : null}
        </GridTableRow>

        {!isLive ? (
          <TimelineAddButtons
            payload={payload}
            onHandleCreate={handleCreate}
            isNear={isNear.value}
          />
        ) : null}
      </Box>
    );
  },
);
