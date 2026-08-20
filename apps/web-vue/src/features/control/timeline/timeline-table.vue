<script setup lang="ts">
import { Box, Center, VStack } from "@styled-system/jsx";
import type { TimelineTableItem as TimelineRowPayload } from "@tgb-resolver/realtime";
import { ref } from "vue";

import { useControlShowQuery, useSeekPlaybackMutation } from "@/features/control/composables/use-show";
import { usePlaybackStore } from "@/features/control/playback-store";
import { useShowStore } from "@/stores/show-store";

import TimelineContextMenu from "./timeline-context-menu.vue";
import TimelineTableHeader from "./timeline-table-header.vue";
import TimelineTableItem from "./timeline-table-item.vue";

defineOptions({ name: "ControlTimelineTable" });
const showQuery = useControlShowQuery();
const showStore = useShowStore();
const playback = usePlaybackStore();
const seekPlayback = useSeekPlaybackMutation();
const contextTarget = ref<{ payload: TimelineRowPayload; x: number; y: number } | null>(null);
function openContextMenu(event: MouseEvent, payload: TimelineRowPayload) {
  event.preventDefault();
  event.stopPropagation();
  contextTarget.value = { payload, x: Math.max(8, Math.min(event.clientX, window.innerWidth - 180)), y: Math.max(8, Math.min(event.clientY, window.innerHeight - 110)) };
}
</script>

<template>
  <Center h="full" px="4" overflow="auto">
    <VStack w="full" alignItems="stretch">
      <TimelineTableHeader />
      <TimelineTableItem v-for="row in showStore.rows" :key="row.id" :payload="row" :is-live="playback.currentEventId === row.id" @seek="seekPlayback.mutate" @contextmenu="openContextMenu" />
      <Box v-if="showQuery.isLoading.value || showStore.rows.length === 0" color="fg.muted" fontSize="sm">{{ showQuery.isLoading.value ? "Loading timeline…" : "No timeline events" }}</Box>
    </VStack>
    <TimelineContextMenu v-if="contextTarget" :target="contextTarget.payload" :x="contextTarget.x" :y="contextTarget.y" @close="contextTarget = null" />
  </Center>
</template>
