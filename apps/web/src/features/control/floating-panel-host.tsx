import { FloatingPanel, IconButton, Portal } from "@chakra-ui/react";
import { GripHorizontal, Maximize2, Minimize2, X } from "lucide-react";
import { useEffect } from "react";

import { floatingPanelModel } from "@/features/control/floating-panel-model";
import {
  floatingPanelComponents,
  floatingPanelConfig,
} from "@/features/control/floating-panel-types";

export function FloatingPanelHost() {
  const panels = floatingPanelModel.panels.value;

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (floatingPanelModel.hasDirtyPanels.value) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  return (
    <>
      {panels.map((panel, index) => {
        const PanelComponent = floatingPanelComponents[panel.type];
        const config = floatingPanelConfig[panel.type];
        const resizable = config?.resizable ?? true;
        const offset = 32 * index;

        return (
          <FloatingPanel.Root
            key={panel.id}
            allowOverflow={false}
            closeOnEscape
            open
            resizable={resizable}
            defaultSize={config?.size}
            minSize={config?.minSize}
            defaultPosition={{ x: 24 + offset, y: 24 + offset }}
            onOpenChange={(details) => {
              if (!details.open) {
                void floatingPanelModel.requestFloatingPanelClose(panel);
              }
            }}
          >
            <Portal>
              <FloatingPanel.Positioner>
                <FloatingPanel.Content>
                  <FloatingPanel.Header>
                    <FloatingPanel.DragTrigger>
                      <GripHorizontal size={16} />
                      <FloatingPanel.Title>{panel.title}</FloatingPanel.Title>
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
                        onClick={() => void floatingPanelModel.requestFloatingPanelClose(panel)}
                      >
                        <X size={14} />
                      </IconButton>
                    </FloatingPanel.Control>
                  </FloatingPanel.Header>
                  <FloatingPanel.Body p={4}>
                    {PanelComponent ? (
                      <PanelComponent panel={panel} {...panel.props.value} />
                    ) : null}
                  </FloatingPanel.Body>
                  {resizable && <FloatingPanel.ResizeTriggers />}
                </FloatingPanel.Content>
              </FloatingPanel.Positioner>
            </Portal>
          </FloatingPanel.Root>
        );
      })}
    </>
  );
}
