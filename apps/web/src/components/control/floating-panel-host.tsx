import { FloatingPanel, IconButton, Portal } from "@chakra-ui/react";
import { GripHorizontal, X } from "lucide-react";

import { useFloatingPanelStore } from "@/store/floating-panel";
import { floatingPanelComponents } from "@/store/floating-panel-types";

export function FloatingPanelHost() {
  const active = useFloatingPanelStore((s) => s.active);
  const requestClose = useFloatingPanelStore((s) => s.requestFloatingPanelClose);
  const PanelComponent = active ? floatingPanelComponents[active.type] : null;

  return (
    <FloatingPanel.Root
      allowOverflow={false}
      closeOnEscape
      open={Boolean(active)}
      size={{ width: 560, height: 360 }}
      onOpenChange={(details) => {
        if (!details.open) {
          void requestClose();
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
                  onClick={() => void requestClose()}
                >
                  <X size={14} />
                </IconButton>
              </FloatingPanel.Control>
            </FloatingPanel.Header>
            <FloatingPanel.Body p={4}>
              {active && PanelComponent ? (
                <PanelComponent {...(active.props as Record<string, unknown>)} />
              ) : null}
            </FloatingPanel.Body>
          </FloatingPanel.Content>
        </FloatingPanel.Positioner>
      </Portal>
    </FloatingPanel.Root>
  );
}
