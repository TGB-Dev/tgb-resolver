import { Box } from "@chakra-ui/react";

import { ControlMainCueTab } from "./tabs/control-main-cue-tab";

export function ControlLiveMainPanel() {
  return (
    <Box flex={1}>
      <ControlMainCueTab />
    </Box>
  );
}
