import { Grid, Splitter, useSplitter } from "@chakra-ui/react";
import { createFileRoute } from "@tanstack/react-router";
import { ControlConfirmDialog } from "@/components/control/control-confirm-dialog";
import { ControlMainPanel } from "@/components/control/panels/control-main-panel";
import { ControlTimelinePanel } from "@/components/control/panels/control-timeline-panel";
import { ControlStatusBar } from "@/components/control/status-bar/control-status-bar";

export const Route = createFileRoute("/control/")({
  component: RouteComponent,
});

function RouteComponent() {
  const splitter = useSplitter({
    defaultSize: [55, 45], // percent

    panels: [
      { id: "main", minSize: 35 },
      { id: "timeline", minSize: 45 },
    ],
  });

  return (
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
    </Grid>
  );
}
