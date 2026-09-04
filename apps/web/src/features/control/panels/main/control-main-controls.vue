<script setup lang="ts">
import { css } from "@styled-system/css";

import AutoplayControls from "./controls/autoplay-controls.vue";
import ConnectionStatusButton from "./controls/connection-status-button.vue";
import LiveModeButton from "./controls/live-mode-button.vue";
import TransportControls from "./controls/transport-controls.vue";

const barClass = css({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  h: "16",
  borderTopWidth: 1,
  borderColor: "border",
  gap: "2",
  p: "2",
});
</script>

<template>
  <div :class="barClass" class="tgb-controls">
    <TransportControls />
    <AutoplayControls />
    <div :class="css({ flex: 1 })" />
    <ConnectionStatusButton />
    <LiveModeButton />
  </div>
</template>
