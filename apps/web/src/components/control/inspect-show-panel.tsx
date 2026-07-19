import { Box, Code, Text } from "@chakra-ui/react";

import { showFile } from "@/features/control/show-store";

export function InspectShowPanel() {
  const file = showFile.value;

  if (!file) {
    return <Text color="fg.muted">No show loaded.</Text>;
  }

  return (
    <Box h="full" overflow="auto">
      <Code display="block" whiteSpace="pre-wrap" p={2}>
        {JSON.stringify(file, null, 2)}
      </Code>
    </Box>
  );
}
