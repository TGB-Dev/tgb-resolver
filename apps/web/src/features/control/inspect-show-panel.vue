<script setup lang="ts">
import { css, cx } from "@styled-system/css";
import { code } from "@styled-system/recipes";
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
const codeClass = cx(
  code(),
  css({ display: "block", whiteSpace: "pre-wrap", p: 2 }),
);
</script>

<template>
  <div :class="root">
    <p v-if="!file" :class="empty">
      No show loaded.
    </p>
    <pre v-else :class="codeClass">{{ JSON.stringify(file, null, 2) }}</pre>
  </div>
</template>
