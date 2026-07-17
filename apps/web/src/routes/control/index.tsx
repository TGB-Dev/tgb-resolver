import { Grid, Splitter, useSplitter } from "@chakra-ui/react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { ControlConfirmDialog } from "@/components/control/control-confirm-dialog";
import { FloatingPanelHost } from "@/components/control/floating-panel-host";
import { ControlMainPanel } from "@/components/control/panels/control-main-panel";
import { ControlTimelinePanel } from "@/components/control/panels/control-timeline-panel";
import { ControlStatusBar } from "@/components/control/status-bar/control-status-bar";
import { ControlRealtimeProvider } from "@/features/control/realtime-provider";
import { getServerNow } from "@tgb-resolver/realtime";
import { useControlNowStore } from "@/store/control-now";

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
  const setNow = useControlNowStore((s) => s.setNow);

  useEffect(() => {
    const id = setInterval(() => setNow(getServerNow()), 200);
    return () => clearInterval(id);
  }, [setNow]);

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
