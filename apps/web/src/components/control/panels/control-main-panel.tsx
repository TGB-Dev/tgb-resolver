import { Grid } from "@chakra-ui/react";
import { useControlStore } from "@/stores/control.store";
import { ControlEditMainPanel } from "./main/control-edit-main-panel";
import { ControlLiveMainPanel } from "./main/control-live-main-panel";
import { ControlMainControls } from "./main/control-main-controls";

export function ControlMainPanel() {
  const isLive = useControlStore((state) => state.show?.mode === "live");
  return (
    <Grid templateRows="1fr auto" h="full">
      {isLive ? <ControlLiveMainPanel /> : <ControlEditMainPanel />}

      <ControlMainControls />
    </Grid>
  );
}
