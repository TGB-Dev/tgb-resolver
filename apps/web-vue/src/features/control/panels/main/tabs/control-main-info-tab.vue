<script setup lang="ts">
import { Box, HStack, VStack } from "@styled-system/jsx";
import { ShowMode } from "@tgb-resolver/realtime";
import { computed } from "vue";

import { useFloatingPanelStore } from "@/features/control/floating-panel-store";
import { FloatingPanelType } from "@/features/control/floating-panel-types";
import UiButton from "@/features/shared/ui/button.vue";
import UiHeading from "@/features/shared/ui/heading.vue";
import { useShowStore } from "@/stores/show-store";

defineOptions({ name: "ControlMainInfoTab" });

const showStore = useShowStore();
const floatingPanelStore = useFloatingPanelStore();

const mode = computed(() => showStore.showMode);
const events = computed(() => showStore.showEvents);
const meta = computed(() => showStore.showMeta);
const orderedIds = computed(() => showStore.showOrderedIds);
const dataVersion = computed(() => showStore.dataVersion);
const eventsCount = computed(() => Object.keys(events.value).length);
</script>

<template>
  <Box h="full" p="4" overflow="auto">
    <VStack gap="4" alignItems="stretch">
      <Box>
        <HStack justifyContent="space-between" mb="2">
          <UiHeading size="md">Show Details</UiHeading>
          <UiButton
            size="sm"
            variant="outline"
            @click="floatingPanelStore.openFloatingPanel(FloatingPanelType.InspectShow, 'Inspect show')"
          >
            Inspect
          </UiButton>
        </HStack>
      </Box>

      <VStack gap="2" alignItems="stretch">
        <Box>
          <Box fontSize="sm" color="fg.muted">Mode</Box>
          <Box fontFamily="mono" fontSize="md">
            {{ mode === ShowMode.EDITING ? "Editing" : mode === ShowMode.LIVE ? "Live" : "Unknown" }}
          </Box>
        </Box>

        <Box v-if="eventsCount > 0">
          <Box fontSize="sm" color="fg.muted">Timeline</Box>
          <Box fontFamily="mono" fontSize="md">
            {{ eventsCount }} event{{ eventsCount !== 1 ? "s" : "" }} | {{ orderedIds.length }} ordered
          </Box>
        </Box>

        <Box v-if="meta">
          <Box fontSize="sm" color="fg.muted">Metadata</Box>
          <Box
            as="pre"
            fontFamily="mono"
            fontSize="xs"
            whiteSpace="pre-wrap"
            p="2"
            bg="bg.muted"
            rounded="md"
          >
            {{ JSON.stringify(meta, null, 2) }}
          </Box>
        </Box>

        <Box>
          <Box fontSize="sm" color="fg.muted">Version</Box>
          <Box fontFamily="mono" fontSize="md">
            {{ dataVersion }}
          </Box>
        </Box>
      </VStack>
    </VStack>
  </Box>
</template>
