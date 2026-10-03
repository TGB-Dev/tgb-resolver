<script setup lang="ts">
import { css } from "@styled-system/css";
import { useIntervalFn } from "@vueuse/core";

import ControlConfirmDialog from "@/features/control/control-confirm-dialog.vue";
import { useControlNowStore } from "@/features/control/control-now-store";
import FloatingPanelHost from "@/features/control/floating-panel-host.vue";
import ControlMainControls from "@/features/control/panels/main/control-main-controls.vue";
import ControlStatusBar from "@/features/control/status-bar/control-status-bar.vue";
import ControlWorkspaceHost from "@/features/control/trellis/control-workspace-host.vue";
import { getServerNow } from "@/lib/realtime-client";

const controlNowStore = useControlNowStore();

useIntervalFn(() => controlNowStore.setNow(getServerNow()), 200);

const root = css({
  display: "flex",
  flexDirection: "column",
  h: "100vh",
  maxH: "100vh",
  w: "100vw",
  maxW: "100vw",
  overflow: "hidden",
});
</script>

<template>
  <div :class="root">
    <ControlStatusBar />
    <ControlWorkspaceHost />
    <ControlMainControls />
    <ControlConfirmDialog />
    <FloatingPanelHost />
  </div>
</template>
