import { Box, DataList, Editable, IconButton } from "@chakra-ui/react";
import { useComputed, useSignal } from "@preact/signals-react";
import { For } from "@preact/signals-react/utils";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { Check, GripVertical, Plus } from "lucide-react";
import type { DragControls } from "motion/react";
import { memo, type ReactNode } from "react";

import { floatingPanelModel } from "@/features/control/floating-panel-model";
import { FloatingPanelType } from "@/features/control/floating-panel-types";
import {
  usePatchTimelineEventMutation,
  useRenameControlEventMutation,
} from "@/features/control/hooks";
import { extensionRegistry } from "@/features/extensions";
import { TgbResolverCssEasings } from "@/features/shared/anim/easings";
import { showModel } from "@/features/shared/show-model";
import { GridTableRow } from "@/features/shared/ui/grid-table";
import { Tooltip } from "@/features/shared/ui/tooltip";

import { CurrentEventIndicator } from "./CurrentEventIndicator";
import { TIMELINE_TABLE_GRID_TEMPLATE_COLUMNS } from "./timeline-table-column.config";

function resolveDisplayName(payload: Pick<TimelineTableItem, "customName" | "placeholderName">) {
  return payload.customName && payload.customName.trim().length > 0
    ? payload.customName
    : payload.placeholderName;
}

function getTimelinePosition(eventId: number, fallback: number) {
  const index = showModel.showOrderedIds.peek().indexOf(eventId);
  return index < 0 ? fallback : index + 1;
}

interface ControlTimelineTableItemProps {
  payload: TimelineTableItem;
  isCurrent: boolean;
  isLive: boolean;
  onSeek: (id: number) => void;
  onOpenContextMenu?: (e: React.MouseEvent, payload: TimelineTableItem) => void;
  dragControls?: DragControls;
  onCreateEvent?: (relativeToEventId: number, before: boolean) => void;
}

export const ControlTimelineTableItem = memo(
  ({
    payload,
    isCurrent,
    isLive,
    onSeek,
    onOpenContextMenu,
    dragControls,
    onCreateEvent,
  }: ControlTimelineTableItemProps) => {
    const durationInSeconds = payload.durationSeconds;
    const isReorderable = payload.type === TimelineEventType.CUS && !isLive;
    const type =
      payload.type !== TimelineEventType.CUS
        ? payload.type
        : !payload.extId
          ? "UNK"
          : extensionRegistry.extensionWithExtId(payload.extId)?.shortName || "UNK";

    const handleCreate = (before: boolean) => {
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
    };

    return (
      <Box
        w="full"
        minH={8}
        position="relative"
        borderBottomColor="border"
        data-event-id={payload.id}
        _light={{
          color: isCurrent ? "fg.inverted" : "fg",
        }}
        onContextMenu={(e) => onOpenContextMenu?.(e, payload)}
        onDoubleClick={() => {
          if (payload.type === TimelineEventType.CUS) {
            const position = getTimelinePosition(payload.id, payload.position);
            floatingPanelModel.openFloatingPanel(
              FloatingPanelType.ExtensionConfig,
              `Edit Event #${position}`,
              { eventId: payload.id },
            );
          }
        }}
        css={{
          "& .add-btn-wrapper": {
            opacity: 0,
            transition: `opacity 0.15s ${TgbResolverCssEasings.swiftOut}`,
            pointerEvents: "none",
          },
          "&:hover .add-btn-wrapper": { opacity: 1, pointerEvents: "auto" },
        }}
      >
        <CurrentEventIndicator isCurrent={isCurrent} durationInSeconds={durationInSeconds} />

        <GridTableRow templateColumns={TIMELINE_TABLE_GRID_TEMPLATE_COLUMNS}>
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
          <ControlTimelineManualInteraction payload={payload} editable={!isLive} />

          <Box display="flex" alignItems="center" justifyContent="center" h="full">
            <IconButton
              aria-label="Drag to reorder event"
              size="2xs"
              variant="ghost"
              disabled={!isReorderable}
              cursor={isReorderable ? "grab" : "not-allowed"}
              _active={{ cursor: isReorderable ? "grabbing" : "not-allowed" }}
              onPointerDown={(e) => {
                if (isReorderable) {
                  dragControls?.start(e);
                }
              }}
              color="fg.muted"
              _hover={isReorderable ? { color: "fg" } : undefined}
            >
              <GripVertical size={14} />
            </IconButton>
          </Box>
        </GridTableRow>

        {!isLive ? (
          <>
            <Tooltip content="Add event before" openDelay={0}>
              <IconButton
                aria-label="Add event before"
                size="2xs"
                variant="subtle"
                className="add-btn-wrapper"
                position="absolute"
                top={0}
                right={0}
                transform="translateY(-100%)"
                borderTopRadius="md"
                borderBottomRadius={0}
                bg={payload.id & 1 ? "bg.subtle" : "bg.muted"}
                _hover={{ bg: "bg.emphasized", color: "fg" }}
                zIndex={20}
                onClick={() => handleCreate(true)}
              >
                <Plus size={12} />
              </IconButton>
            </Tooltip>

            <Tooltip content="Add event after" openDelay={0}>
              <IconButton
                aria-label="Add event after"
                size="2xs"
                variant="subtle"
                className="add-btn-wrapper"
                position="absolute"
                bottom={0}
                right={0}
                transform="translateY(100%)"
                borderTopRadius={0}
                borderBottomRadius="md"
                bg={payload.id & 1 ? "bg.subtle" : "bg.muted"}
                _hover={{ bg: "bg.emphasized", color: "fg" }}
                zIndex={20}
                onClick={() => handleCreate(false)}
              >
                <Plus size={12} />
              </IconButton>
            </Tooltip>
          </>
        ) : null}
      </Box>
    );
  },
);

function TimelineEventPosition({
  eventId,
  fallbackPosition,
  onSeek,
}: {
  eventId: number;
  fallbackPosition: number;
  onSeek: (id: number) => void;
}) {
  const position = useComputed(() => {
    const index = showModel.showOrderedIds.value.indexOf(eventId);
    return index < 0 ? fallbackPosition : index + 1;
  });

  return (
    <Tooltip
      content={`Seek to event #${position.value}`}
      openDelay={0}
      positioning={{ placement: "left" }}
    >
      <Box textAlign="end" fontFamily="mono" cursor="pointer" onClick={() => onSeek(eventId)}>
        {position.value}
      </Box>
    </Tooltip>
  );
}

export function ControlTimelineTableHeader() {
  return (
    <GridTableRow
      templateColumns={TIMELINE_TABLE_GRID_TEMPLATE_COLUMNS}
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

      <Box />
    </GridTableRow>
  );
}

function ControlTimelineManualInteraction({
  payload,
  editable,
}: {
  payload: TimelineTableItem;
  editable: boolean;
}) {
  const patchEvent = usePatchTimelineEventMutation();
  return (
    <IconButton
      aria-label="Toggle manual interaction"
      variant="ghost"
      minW={0}
      w="full"
      h={6}
      m={1}
      disabled={!editable}
      cursor={editable ? "pointer" : undefined}
      title={editable ? "Double-click to toggle manual interaction" : undefined}
      onDoubleClick={() => {
        void patchEvent.mutateAsync({
          eventId: payload.id,
          requireManualInteraction: !payload.requireManualInteraction,
        });
      }}
    >
      {payload.requireManualInteraction ? <Check size={14} /> : null}
    </IconButton>
  );
}

function ControlTimelineNumberEditable({
  payload,
  field,
}: {
  payload: TimelineTableItem;
  field: "durationSeconds" | "triggerOffsetSeconds";
}) {
  const patchEvent = usePatchTimelineEventMutation();
  const current = payload[field];
  return (
    <TimelineCellEditable
      value={current == null ? "" : String(current)}
      displayValue={
        field === "triggerOffsetSeconds" && current != null && current > 0
          ? `+${current}`
          : (current ?? "")
      }
      onBlankCommit={() =>
        void patchEvent.mutateAsync({
          eventId: payload.id,
          ...(field === "durationSeconds"
            ? { useDefaultDuration: true }
            : { clearTriggerOffset: true }),
        })
      }
      textAlign="end"
      fontFamily="mono"
      onCommit={(value) => {
        const normalizedValue = value.trim();
        const next = Number(normalizedValue);
        if (Number.isFinite(next) && (field !== "durationSeconds" || next >= 0) && next !== current)
          void patchEvent.mutateAsync({ eventId: payload.id, [field]: next });
      }}
    />
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

interface ControlTimelineEventCustomNameEditableProps {
  payload: TimelineTableItem;
}

const ControlTimelineEventCustomNameEditable = memo(
  function ControlTimelineEventCustomNameEditable({
    payload,
  }: ControlTimelineEventCustomNameEditableProps) {
    const renameEvent = useRenameControlEventMutation();
    const currentName = payload.customName ?? "";
    return (
      <TimelineCellEditable
        value={currentName}
        displayValue={resolveDisplayName(payload)}
        placeholder={payload.placeholderName}
        textAlign="start"
        onCommit={(value) => {
          const customName = value.trim();
          if (customName !== currentName.trim()) {
            void renameEvent.mutateAsync({ eventId: payload.id, type: payload.type, customName });
          }
        }}
      />
    );
  },
);

function TimelineCellEditable({
  value,
  displayValue,
  placeholder,
  onBlankCommit,
  textAlign = "start",
  fontFamily,
  onCommit,
}: {
  value: string;
  displayValue: ReactNode;
  placeholder?: string;
  onBlankCommit?: () => void;
  textAlign?: "start" | "end";
  fontFamily?: string;
  onCommit: (value: string) => void;
}) {
  const editing = useSignal(false);
  const draft = useSignal(value);
  if (!editing.value)
    return (
      <Box
        px={1}
        py={0.5}
        minH={6}
        borderRadius="sm"
        textAlign={textAlign}
        fontFamily={fontFamily}
        cursor="text"
        overflow="hidden"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
        onDoubleClick={(event) => {
          event.stopPropagation();
          draft.value = value;
          editing.value = true;
        }}
      >
        {displayValue}
      </Box>
    );
  return (
    <Editable.Root
      defaultEdit
      submitMode="both"
      value={draft.value}
      placeholder={placeholder}
      onDoubleClick={(event) => event.stopPropagation()}
      onValueChange={({ value }) => (draft.value = value)}
      onValueCommit={({ value }) => {
        if (value.trim().length === 0 && onBlankCommit) onBlankCommit();
        else onCommit(value);
        editing.value = false;
      }}
      onValueRevert={() => (editing.value = false)}
    >
      <Editable.Preview
        px={1}
        py={0.5}
        minH={6}
        borderRadius="sm"
        textAlign={textAlign}
        fontFamily={fontFamily}
        cursor="text"
        overflow="hidden"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
      />
      <Editable.Input
        px={1}
        py={0.5}
        minH={6}
        borderRadius="sm"
        textAlign={textAlign}
        fontFamily={fontFamily}
        bg="bg.panel"
        autoFocus
      />
    </Editable.Root>
  );
}
