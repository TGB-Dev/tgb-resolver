import { FloatingPanel, IconButton, Portal } from "@chakra-ui/react";
import { useAtomValue } from "jotai";
import { GripHorizontal, X } from "lucide-react";

import { floatingPanelStateAtom, requestFloatingPanelClose } from "@/state/floating-panel";

export function FloatingPanelHost() {
  const { active } = useAtomValue(floatingPanelStateAtom);

  return (
    <FloatingPanel.Root
      allowOverflow={false}
      closeOnEscape
      open={Boolean(active)}
      size={{ width: 560, height: 360 }}
      onOpenChange={(details) => {
        if (!details.open) {
          void requestFloatingPanelClose();
        }
      }}
    >
      <Portal>
        <FloatingPanel.Positioner>
          <FloatingPanel.Content>
            <FloatingPanel.Header>
              <FloatingPanel.DragTrigger>
                <GripHorizontal size={16} />
                <FloatingPanel.Title>{active?.title}</FloatingPanel.Title>
              </FloatingPanel.DragTrigger>
              <FloatingPanel.Control>
                <IconButton
                  aria-label="Close panel"
                  size="2xs"
                  variant="ghost"
                  onClick={() => void requestFloatingPanelClose()}
                >
                  <X size={14} />
                </IconButton>
              </FloatingPanel.Control>
            </FloatingPanel.Header>
            <FloatingPanel.Body p={4}>{active?.content}</FloatingPanel.Body>
          </FloatingPanel.Content>
        </FloatingPanel.Positioner>
      </Portal>
    </FloatingPanel.Root>
  );
}
