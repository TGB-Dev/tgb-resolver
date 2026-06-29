import { Grid } from "@chakra-ui/react";

import { useControlIsLive } from "@/features/control/hooks";

import { ControlEditMainPanel } from "./main/control-edit-main-panel";
import { ControlLiveMainPanel } from "./main/control-live-main-panel";
import { ControlMainControls } from "./main/control-main-controls";

export function ControlMainPanel() {
  const isLive = useControlIsLive();
  return (
    <Grid templateRows="1fr auto" h="full">
      {isLive ? <ControlLiveMainPanel /> : <ControlEditMainPanel />}

      <ControlMainControls />
    </Grid>
  );
}
