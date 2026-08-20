<script setup lang="ts">
import { SplitterPanel, SplitterResizeTrigger, SplitterRoot } from "@ark-ui/vue";
import { Box, Grid } from "@styled-system/jsx";
import { splitter } from "@styled-system/recipes";
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
const splitterClasses = splitter();

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
      <Box w="full" h="full" borderWidth="1" borderColor="border">
        <SplitterRoot
          :class="splitterClasses.root"
          orientation="horizontal"
          :defaultSize="[55, 45]"
          :panels="[{ id: 'main', minSize: 35 }, { id: 'timeline', minSize: 45 }]"
        >
          <SplitterPanel id="main" :minSize="35" :class="splitterClasses.panel">
            <ControlMainPanel />
          </SplitterPanel>
          <SplitterResizeTrigger id="main:timeline" :class="splitterClasses.resizeTrigger" />
          <SplitterPanel id="timeline" :minSize="45" :class="splitterClasses.panel">
            <ControlTimelinePanel />
          </SplitterPanel>
        </SplitterRoot>
      </Box>
    </Grid>
    <ControlConfirmDialog />
    <FloatingPanelHost />
  </ControlRealtimeProvider>
</template>
