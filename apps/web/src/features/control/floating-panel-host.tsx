import { FloatingPanel, IconButton, Portal } from "@chakra-ui/react";
import { GripHorizontal, Maximize2, Minimize2, X } from "lucide-react";

import { floatingPanelModel } from "@/features/control/floating-panel-model";
import {
  floatingPanelComponents,
  floatingPanelConfig,
} from "@/features/control/floating-panel-types";

export function FloatingPanelHost() {
  const active = floatingPanelModel.active.value;
  const requestClose = floatingPanelModel.requestFloatingPanelClose;
  const PanelComponent = active ? floatingPanelComponents[active.type] : null;
  const config = active ? floatingPanelConfig[active.type] : undefined;
  const resizable = config?.resizable ?? true;

  return (
    <FloatingPanel.Root
      allowOverflow={false}
      closeOnEscape
      open={Boolean(active)}
      resizable={resizable}
      defaultSize={config?.size}
      minSize={config?.minSize}
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
                {config?.maximizable && (
                  <>
                    <FloatingPanel.StageTrigger stage="maximized" asChild>
                      <IconButton aria-label="Maximize panel" size="2xs" variant="ghost">
                        <Maximize2 size={14} />
                      </IconButton>
                    </FloatingPanel.StageTrigger>
                    <FloatingPanel.StageTrigger stage="default" asChild>
                      <IconButton aria-label="Restore panel" size="2xs" variant="ghost">
                        <Minimize2 size={14} />
                      </IconButton>
                    </FloatingPanel.StageTrigger>
                  </>
                )}
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
            {resizable && <FloatingPanel.ResizeTriggers />}
          </FloatingPanel.Content>
        </FloatingPanel.Positioner>
      </Portal>
    </FloatingPanel.Root>
  );
}
