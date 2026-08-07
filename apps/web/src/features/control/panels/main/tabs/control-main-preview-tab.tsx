import { Box, Center, Text } from "@chakra-ui/react";

export function ControlMainPreviewTab() {
  return (
    <Box h="full" overflowY="auto" css={{ overflowAnchor: "none" }}>
      {/*<Resolve />*/}
      <Center h="full" w="full">
        <Text maxW="80ch" textAlign="center">
          Because of performance issues, preview is disabled. Please use the audience view in the
          mean time. We're sorry for this inconvenience!
        </Text>
      </Center>
    </Box>
  );
}
