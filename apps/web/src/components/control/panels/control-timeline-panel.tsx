import { Grid } from "@chakra-ui/react";

import { ControlTimelineTable } from "../timeline/timeline-table";
import { ControlTimelineControls } from "./timeline/control-timeline-controls";

export function ControlTimelinePanel() {
  return (
    <Grid templateRows="1fr auto" h="full">
      <ControlTimelineTable />

      <ControlTimelineControls />
    </Grid>
  );
}
