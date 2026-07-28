import { Box, Code, Text } from "@chakra-ui/react";

import { showModel } from "@/models";

export function InspectShowPanel() {
  const file = showModel.showFile.value;

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
