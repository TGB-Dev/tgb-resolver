<script setup lang="ts">
import { SplitterPanel, SplitterResizeTrigger, SplitterRoot } from "@ark-ui/vue";
import { Box, Grid } from "@styled-system/jsx";
import { onUnmounted } from "vue";

import ControlConfirmDialog from "@/features/control/control-confirm-dialog.vue";
import { useControlNowStore } from "@/features/control/control-now-store";
import FloatingPanelHost from "@/features/control/floating-panel-host.vue";
import ControlMainPanel from "@/features/control/panels/control-main-panel.vue";
import ControlTimelinePanel from "@/features/control/panels/control-timeline-panel.vue";
import ControlRealtimeProvider from "@/features/control/realtime-provider.vue";
import ControlStatusBar from "@/features/control/status-bar/control-status-bar.vue";
import { getServerNow } from "@/lib/realtime-client";

const controlNowStore = useControlNowStore();

let clockInterval: ReturnType<typeof setInterval> | null = null;
clockInterval = setInterval(() => controlNowStore.setNow(getServerNow()), 200);
onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval);
});
</script>

<template>
  <ControlRealtimeProvider>
    <Grid templateRows="auto 1fr" h="100dvh" maxH="100dvh" w="100dvw" maxW="100dvw" overflow="hidden">
      <ControlStatusBar />
      <Box w="full" h="full" borderWidth="1">
        <SplitterRoot orientation="horizontal" :defaultSize="[55, 45]" :panels="[{ id: 'main', minSize: 35 }, { id: 'timeline', minSize: 45 }]" h="full">
          <SplitterPanel id="main" :minSize="35">
            <ControlMainPanel />
          </SplitterPanel>
          <SplitterResizeTrigger id="main:timeline" />
          <SplitterPanel id="timeline" :minSize="45">
            <ControlTimelinePanel />
          </SplitterPanel>
        </SplitterRoot>
      </Box>
      <ControlConfirmDialog />
      <FloatingPanelHost />
    </Grid>
  </ControlRealtimeProvider>
</template>
