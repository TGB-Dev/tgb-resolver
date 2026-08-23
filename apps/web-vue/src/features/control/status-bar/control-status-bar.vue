<script setup lang="ts">
import { css } from "@styled-system/css";
import { button } from "@styled-system/recipes";

import ControlCurrentTime from "@/features/control/status-bar/control-current-time.vue";
import ControlElapsedTime from "@/features/control/status-bar/control-elapsed-time.vue";
import ControlFullScreenButton from "@/features/control/status-bar/control-full-screen-button.vue";
import ColorModeButton from "@/features/shared/ui/color-mode-button.vue";

const bar = css({
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  h: 16,
  px: 2,
  borderBottomWidth: 1,
  alignItems: "center",
});
const side = css({ display: "flex", alignItems: "center", h: "full" });
const sideEnd = css({ display: "flex", alignItems: "center", justifyContent: "flex-end", h: "full", gap: 2 });
</script>

<template>
  <div :class="bar">
    <div :class="side">
      <ControlFullScreenButton />
      <ControlCurrentTime />
    </div>

    <ControlElapsedTime />

    <div :class="sideEnd">
      <button type="button" :class="button({ variant: 'outline' })">
        <a href="/" target="_blank" rel="noopener noreferrer">Open audience view (new tab)</a>
      </button>
      <ColorModeButton />
    </div>
  </div>
</template>
