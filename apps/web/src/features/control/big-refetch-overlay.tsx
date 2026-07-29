import { Box, Spinner, Text, VStack } from "@chakra-ui/react";

import { realtimeModel } from "@/features/shared/realtime-model";

export function BigRefetchOverlay() {
  if (!realtimeModel.bigRefetching.value) {
    return null;
  }

  return (
    <Box
      alignItems="center"
      background="blackAlpha.700"
      display="flex"
      inset="0"
      justifyContent="center"
      position="fixed"
      zIndex="toast"
    >
      <VStack gap="4">
        <Spinner size="xl" />
        <Text color="fg.muted" fontSize="sm">
          Syncing show…
        </Text>
      </VStack>
    </Box>
  );
}
