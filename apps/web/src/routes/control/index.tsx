import { Grid, Splitter, useSplitter } from "@chakra-ui/react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { ControlConfirmDialog } from "@/features/control/control-confirm-dialog";
import { controlNowModel } from "@/features/control/control-now-model";
import { FloatingPanelHost } from "@/features/control/floating-panel-host";
import { ControlMainPanel } from "@/features/control/panels/control-main-panel";
import { ControlTimelinePanel } from "@/features/control/panels/control-timeline-panel";
import { ControlRealtimeProvider } from "@/features/control/realtime-provider";
import { ControlStatusBar } from "@/features/control/status-bar/control-status-bar";
import { getServerNow } from "@/lib/realtime-client";

export const Route = createFileRoute("/control/")({
  component: RouteComponent,
});

function RouteComponent() {
  const splitter = useSplitter({
    defaultSize: [55, 45],
    panels: [
      { id: "main", minSize: 35 },
      { id: "timeline", minSize: 45 },
    ],
  });
  const setNow = controlNowModel.setNow;

  useEffect(() => {
    const id = setInterval(() => setNow(getServerNow()), 200);
    return () => clearInterval(id);
  }, []);

  return (
    <ControlRealtimeProvider>
      <Grid
        templateRows="auto 1fr"
        h="100dvh"
        maxH="100dvh"
        w="100dvw"
        maxW="100dvw"
        overflow="hidden"
      >
        <ControlStatusBar />
        <Splitter.RootProvider value={splitter} borderWidth={1} h="full">
          <Splitter.Panel id="main">
            <ControlMainPanel />
          </Splitter.Panel>
          <Splitter.ResizeTrigger id="main:timeline" />
          <Splitter.Panel id="timeline">
            <ControlTimelinePanel />
          </Splitter.Panel>
        </Splitter.RootProvider>
        <ControlConfirmDialog />
        <FloatingPanelHost />
      </Grid>
    </ControlRealtimeProvider>
  );
}
