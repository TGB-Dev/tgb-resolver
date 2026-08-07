import { Box } from "@chakra-ui/react";

import { Resolve } from "@/features/leaderboard/leaderboard";

export function ControlMainPreviewTab() {
  return (
    <Box h="full" overflowY="auto" css={{ overflowAnchor: "none" }}>
      <Resolve />
    </Box>
  );
}
