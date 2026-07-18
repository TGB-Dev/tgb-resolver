import { Box, Code, Heading, Text, VStack } from "@chakra-ui/react";
import { ShowMode } from "@tgb-resolver/realtime";

import {
  dataVersion,
  showEvents,
  showMeta,
  showMode,
  showOrderedIds,
} from "@/features/control/show-store";

export function ControlMainInfoTab() {
  const mode = showMode.value;
  const events = showEvents.value;
  const meta = showMeta.value;

  return (
    <Box boxSize="full" p={4}>
      <VStack gap={4} align="stretch">
        <Box>
          <Heading size="md" mb={2}>
            Show Details
          </Heading>
        </Box>

        <VStack gap={2} align="stretch">
          <Box>
            <Text fontSize="sm" color="fg.muted">
              Mode
            </Text>
            <Text fontFamily="mono" fontSize="md">
              {mode === ShowMode.EDITING ? "Editing" : mode === ShowMode.LIVE ? "Live" : "Unknown"}
            </Text>
          </Box>

          {events.size > 0 && (
            <Box>
              <Text fontSize="sm" color="fg.muted">
                Timeline
              </Text>
              <Text fontFamily="mono" fontSize="md">
                {events.size} event{events.size !== 1 ? "s" : ""} | {showOrderedIds.value.length}{" "}
                ordered
              </Text>
            </Box>
          )}

          {meta && (
            <Box>
              <Text fontSize="sm" color="fg.muted">
                Metadata
              </Text>
              <Code display="block" whiteSpace="pre-wrap" p={2}>
                {JSON.stringify(meta, null, 2)}
              </Code>
            </Box>
          )}

          <Box>
            <Text fontSize="sm" color="fg.muted">
              Version
            </Text>
            <Text fontFamily="mono" fontSize="md">
              {dataVersion.value}
            </Text>
          </Box>
        </VStack>
      </VStack>
    </Box>
  );
}
