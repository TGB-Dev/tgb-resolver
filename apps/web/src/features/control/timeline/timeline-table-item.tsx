import { Box, Button, DataList, Editable, IconButton } from "@chakra-ui/react";
import { For } from "@preact/signals-react/utils";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { Check, GripVertical, Plus } from "lucide-react";
import type { DragControls } from "motion/react";
import { memo, useCallback, useState } from "react";

import { floatingPanelModel } from "@/features/control/floating-panel-model";
import { FloatingPanelType } from "@/features/control/floating-panel-types";
import {
  usePatchTimelineEventMutation,
  useRenameControlEventMutation,
} from "@/features/control/hooks";
import { extensionRegistry } from "@/features/extensions";
import { GridTableRow } from "@/features/shared/ui/grid-table";
import { Tooltip } from "@/features/shared/ui/tooltip";

import { CurrentEventIndicator } from "./CurrentEventIndicator";
import { TIMELINE_TABLE_GRID_TEMPLATE_COLUMNS } from "./timeline-table-column.config";

function resolveDisplayName(payload: Pick<TimelineTableItem, "customName" | "placeholderName">) {
  return payload.customName && payload.customName.trim().length > 0
    ? payload.customName
    : payload.placeholderName;
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
      if (onCreateEvent) {
        onCreateEvent(payload.id, before);
      } else {
        floatingPanelModel.openFloatingPanel(
          FloatingPanelType.CreateEvent,
          `Create Event (${before ? "Before" : "After"} #${payload.position})`,
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
        bg={payload.position & 1 ? "bg" : "bg.emphasized"}
        css={{
          "& .add-btn-wrapper": {
            opacity: 0,
            transition: "opacity 0.15s ease-in-out",
            pointerEvents: "none",
          },
          "&:hover .add-btn-wrapper": { opacity: 1, pointerEvents: "auto" },
        }}
      >
        <CurrentEventIndicator isCurrent={isCurrent} durationInSeconds={durationInSeconds} />

        <GridTableRow templateColumns={TIMELINE_TABLE_GRID_TEMPLATE_COLUMNS}>
          <Tooltip
            content={`Seek to event #${payload.position}`}
            openDelay={0}
            positioning={{ placement: "left" }}
          >
            <Box
              textAlign="end"
              fontFamily="mono"
              cursor="pointer"
              onClick={() => onSeek(payload.id)}
            >
              {payload.position}
            </Box>
          </Tooltip>
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
            <Tooltip content={`Add event before #${payload.position}`} openDelay={0}>
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

            <Tooltip content={`Add event after #${payload.position}`} openDelay={0}>
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
    <Button
      aria-label="Toggle manual interaction"
      variant="ghost"
      minW={0}
      w="full"
      h="full"
      p={0}
      justifyContent="flex-start"
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
      {payload.requireManualInteraction ? <Check size={18} /> : null}
    </Button>
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
  const [editing, setEditing] = useState(false);
  const [draftValue, setDraftValue] = useState("");
  const current = payload[field];
  if (!editing)
    return (
      <Box
        w="full"
        h="full"
        textAlign="end"
        fontFamily="mono"
        cursor="text"
        onDoubleClick={() => {
          setDraftValue(current == null ? "" : String(current));
          setEditing(true);
        }}
      >
        {field === "triggerOffsetSeconds" && current != null && current > 0
          ? `+${current}`
          : (current ?? "")}
      </Box>
    );
  return (
    <Editable.Root
      defaultEdit
      submitMode="both"
      w="full"
      h="full"
      value={draftValue}
      onValueChange={({ value }) => setDraftValue(value)}
      onValueCommit={({ value }) => {
        const normalizedValue = value.trim();
        if (normalizedValue.length === 0) {
          void patchEvent.mutateAsync({
            eventId: payload.id,
            ...(field === "durationSeconds"
              ? { useDefaultDuration: true }
              : { clearTriggerOffset: true }),
          });
        } else {
          const next = Number(normalizedValue);
          if (
            Number.isFinite(next) &&
            (field !== "durationSeconds" || next >= 0) &&
            next !== current
          )
            void patchEvent.mutateAsync({ eventId: payload.id, [field]: next });
        }
        setEditing(false);
      }}
      onValueRevert={() => setEditing(false)}
    >
      <Editable.Input autoFocus textAlign="end" fontFamily="mono" />
    </Editable.Root>
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
    const [editing, setEditing] = useState(false);

    // Mount the heavy Chakra `Editable` only while this specific row is being
    // edited. Otherwise render a cheap text node so the timeline can mount
    // hundreds of rows without paying the Editable mount/effect cost per row.
    if (!editing) {
      return (
        <Box
          onDoubleClick={() => setEditing(true)}
          cursor="text"
          px={1}
          py={0.5}
          minH={6}
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
          title={resolveDisplayName(payload)}
        >
          {resolveDisplayName(payload)}
        </Box>
      );
    }

    return <ControlTimelineEventNameEditor payload={payload} onDone={() => setEditing(false)} />;
  },
);

interface ControlTimelineEventNameEditorProps {
  payload: TimelineTableItem;
  onDone: () => void;
}

function ControlTimelineEventNameEditor({ payload, onDone }: ControlTimelineEventNameEditorProps) {
  const renameEvent = useRenameControlEventMutation();
  const [draftName, setDraftName] = useState(payload.customName ?? "");

  const commitName = useCallback(
    async (nextValue: string) => {
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
    },
    [payload.customName, payload.id, payload.type, renameEvent],
  );

  const handleValueChange = useCallback(({ value }: { value: string }) => setDraftName(value), []);

  return (
    <Editable.Root
      activationMode="dblclick"
      submitMode="both"
      defaultEdit
      value={draftName}
      placeholder={payload.placeholderName}
      onValueChange={handleValueChange}
      onValueCommit={({ value }) => {
        void commitName(value);
        onDone();
      }}
      onValueRevert={() => {
        setDraftName(payload.customName ?? "");
        onDone();
      }}
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
