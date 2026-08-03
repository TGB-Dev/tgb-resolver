import { Box, Button, Portal } from "@chakra-ui/react";
import { createModel, signal, useSignalEffect } from "@preact/signals-react";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { useRef } from "react";

import { floatingPanelModel } from "@/features/control/floating-panel-model";
import { FloatingPanelType } from "@/features/control/floating-panel-types";
import { useDeleteTimelineEventMutation } from "@/features/control/hooks";
import { confirmActionModel } from "@/features/shared/confirm-action-model";
import { showModel } from "@/features/shared/show-model";

export interface TimelineContextState {
  isOpen: boolean;
  x: number;
  y: number;
  target: TimelineTableItem | null;
}

const closedState = (): TimelineContextState => ({
  isOpen: false,
  x: 0,
  y: 0,
  target: null,
});

function getTimelinePosition(eventId: number, fallback: number) {
  const index = showModel.showOrderedIds.peek().indexOf(eventId);
  return index < 0 ? fallback : index + 1;
}

function createTimelineContextMenuModel() {
  const state = signal<TimelineContextState>(closedState());

  function close() {
    state.value = closedState();
  }

  function open(
    e: Pick<React.MouseEvent, "preventDefault" | "stopPropagation" | "clientX" | "clientY">,
    payload: TimelineTableItem,
  ) {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 170;
    const menuItemHeight = 48;
    const menuHeight = menuItemHeight * 2 + 8;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8);
    state.value = {
      isOpen: true,
      x: Math.max(8, x),
      y: Math.max(8, y),
      target: {
        ...payload,
        position: getTimelinePosition(payload.id, payload.position),
      },
    };
  }

  return { state, open, close };
}

type TimelineContextMenuModelState = ReturnType<typeof createTimelineContextMenuModel>;
const TimelineContextMenuModel = createModel<TimelineContextMenuModelState>(() =>
  createTimelineContextMenuModel(),
);

export function useTimelineRowContextMenu() {
  const modelRef = useRef<InstanceType<typeof TimelineContextMenuModel>>(null);
  if (!modelRef.current) modelRef.current = new TimelineContextMenuModel();
  const model = modelRef.current;

  useSignalEffect(() => {
    if (!model.state.value.isOpen) return;

    function handlePointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-timeline-context-menu]")) return;
      model.close();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  });

  return { ...model, state: model.state.value };
}

export function TimelineRowContextMenu({
  state,
  onClose,
}: {
  state: TimelineContextState;
  onClose: () => void;
}) {
  const deleteTimelineEvent = useDeleteTimelineEventMutation();

  if (!state.isOpen || !state.target || state.target.type !== TimelineEventType.CUS) {
    return null;
  }
  const eventPosition = state.target.position;

  const eventId = state.target.id;

  return (
    <Portal>
      <Box
        data-timeline-context-menu
        position="fixed"
        left={state.x}
        top={state.y}
        zIndex="popover"
        bg="bg.panel"
        borderWidth={1}
        borderColor="border"
        rounded="md"
        shadow="lg"
        py={1}
        minW="160px"
      >
        <Button
          variant="ghost"
          size="sm"
          w="full"
          justifyContent="flex-start"
          px={3}
          borderRadius="none"
          onClick={() => {
            onClose();
            floatingPanelModel.openFloatingPanel(
              FloatingPanelType.ExtensionConfig,
              `Edit Event #${eventPosition}`,
              { eventId },
            );
          }}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          w="full"
          justifyContent="flex-start"
          px={3}
          borderRadius="none"
          color="fg.error"
          _hover={{ bg: "bg.error", color: "fg.error" }}
          onClick={async () => {
            onClose();
            const accepted = await confirmActionModel.confirmAction({
              title: "Delete Event",
              message: `Delete custom event #${eventPosition}?`,
              confirmLabel: "Delete",
              cancelLabel: "Cancel",
            });

            if (accepted) {
              await deleteTimelineEvent.mutateAsync(eventId);
            }
          }}
        >
          Delete
        </Button>
      </Box>
    </Portal>
  );
}
