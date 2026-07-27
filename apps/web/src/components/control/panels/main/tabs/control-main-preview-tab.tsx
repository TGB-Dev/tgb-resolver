import { Box } from "@chakra-ui/react";

import { Resolve } from "@/components/resolve/resolve";

export function ControlMainPreviewTab() {
  return (
    <Box h="full" overflowY="auto" css={{ overflowAnchor: "none" }}>
      <Resolve />
    </Box>
  );
}
