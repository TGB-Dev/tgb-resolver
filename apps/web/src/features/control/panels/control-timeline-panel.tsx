import { Grid } from "@chakra-ui/react";
import { useRef } from "react";

import { ControlTimelineTable, type ControlTimelineTableHandle } from "../timeline/timeline-table";
import { ControlTimelineControls } from "./timeline/control-timeline-controls";

export function ControlTimelinePanel() {
  const apiRef = useRef<ControlTimelineTableHandle | null>(null);

  return (
    <Grid templateRows="1fr auto" h="full">
      <ControlTimelineTable apiRef={apiRef} />

      <ControlTimelineControls onJumpToCurrent={() => apiRef.current?.scrollToCurrent()} />
    </Grid>
  );
}
