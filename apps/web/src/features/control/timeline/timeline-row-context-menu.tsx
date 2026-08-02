import { Box, Button, Portal } from "@chakra-ui/react";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { useCallback, useEffect, useState } from "react";

import { useDeleteTimelineEventMutation } from "@/features/control/hooks";
import { confirmActionModel } from "@/features/shared/confirm-action-model";

interface TimelineContextState {
  isOpen: boolean;
  x: number;
  y: number;
  target: TimelineTableItem | null;
}

export function useTimelineRowContextMenu() {
  const [state, setState] = useState<TimelineContextState>({
    isOpen: false,
    x: 0,
    y: 0,
    target: null,
  });

  const close = useCallback(() => {
    setState({ isOpen: false, x: 0, y: 0, target: null });
  }, []);

  function open(e: React.MouseEvent, payload: TimelineTableItem) {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 170;
    const menuHeight = 56;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8);
    setState({
      isOpen: true,
      x: Math.max(8, x),
      y: Math.max(8, y),
      target: payload,
    });
  }

  useEffect(() => {
    if (!state.isOpen) {
      return;
    }

    function handlePointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-timeline-context-menu]")) return;
      close();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [state.isOpen, close]);

  return { state, open, close };
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
          color="fg.error"
          _hover={{ bg: "bg.error", color: "fg.error" }}
          onClick={async () => {
            onClose();
            const accepted = await confirmActionModel.confirmAction({
              title: "Delete Event",
              message: `Delete custom event #${state.target?.id}?`,
              confirmLabel: "Delete",
              cancelLabel: "Cancel",
            });

            if (accepted) {
              await deleteTimelineEvent.mutateAsync(state.target?.id);
            }
          }}
        >
          Delete
        </Button>
      </Box>
    </Portal>
  );
}
