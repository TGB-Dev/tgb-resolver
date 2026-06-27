import { Box } from "@chakra-ui/react";

import { ControlMainCueTab } from "./tabs/control-main-cue-tab";

/**
 * The main panel for the control page in live mode.
 * @returns Only the cue tab (which is the only needed tab in live mode)
 */
export function ControlLiveMainPanel() {
  return (
    <Box flex={1}>
      <ControlMainCueTab />
    </Box>
  );
}
