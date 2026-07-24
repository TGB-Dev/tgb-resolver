import { Box, Button, Code, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import { ShowMode } from "@tgb-resolver/realtime";

import { floatingPanelModel, showModel } from "@/models";
import { FloatingPanelType } from "@/models/floating-panel-types";

export function ControlMainInfoTab() {
  const mode = showModel.showMode.value;
  const events = showModel.showEvents.value;
  const meta = showModel.showMeta.value;

  return (
    <Box boxSize="full" p={4}>
      <VStack gap={4} align="stretch">
        <Box>
          <HStack justify="space-between" mb={2}>
            <Heading size="md">Show Details</Heading>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void floatingPanelModel.openFloatingPanel(
                  FloatingPanelType.InspectShow,
                  "Inspect show",
                )
              }
            >
              Inspect
            </Button>
          </HStack>
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

          {Object.keys(events).length > 0 && (
            <Box>
              <Text fontSize="sm" color="fg.muted">
                Timeline
              </Text>
              <Text fontFamily="mono" fontSize="md">
                {Object.keys(events).length} event{Object.keys(events).length !== 1 ? "s" : ""} |{" "}
                {showModel.showOrderedIds.value.length} ordered
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
              {showModel.dataVersion.value}
            </Text>
          </Box>
        </VStack>
      </VStack>
    </Box>
  );
}
