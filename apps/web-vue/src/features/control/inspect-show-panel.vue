<script setup lang="ts">
import { css } from "@styled-system/css";
import { computed } from "vue";

import type { FloatingPanelHandle } from "@/features/control/floating-panel-types";
import { useShowStore } from "@/stores/show-store";

defineProps<{
  panel?: FloatingPanelHandle;
}>();

const showStore = useShowStore();
const file = computed(() => showStore.showFile);

const root = css({ height: "full", overflow: "auto" });
const empty = css({ color: "fg.muted" });
const code = css({
  display: "block",
  fontFamily: "mono",
  fontSize: "xs",
  whiteSpace: "pre-wrap",
  padding: "2",
  bg: "bg.muted",
  rounded: "md",
});
</script>

<template>
  <div :class="root">
    <p v-if="!file" :class="empty">
      No show loaded.
    </p>
    <pre v-else :class="code">{{ JSON.stringify(file, null, 2) }}</pre>
  </div>
</template>
