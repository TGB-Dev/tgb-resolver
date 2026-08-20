<script setup lang="ts">
import { DialogContent, DialogPositioner, DialogRoot } from "@ark-ui/vue";

import { useFloatingPanelStore } from "@/features/control/floating-panel-store";

defineOptions({ name: "FloatingPanelHost" });
const store = useFloatingPanelStore();
</script>
<template>
  <DialogRoot :open="store.panels.length > 0">
    <DialogPositioner><DialogContent><div v-if="store.panels.length > 0">{{ store.panels[store.panels.length - 1]?.title }}</div></DialogContent></DialogPositioner>
  </DialogRoot>
</template>
<style scoped>[data-part="content"] { background: var(--colors-bg); }</style>
