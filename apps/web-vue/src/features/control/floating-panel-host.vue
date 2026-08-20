<script setup lang="ts">
import { DialogContent, DialogPositioner, DialogRoot } from "@ark-ui/vue";
import { dialog } from "@styled-system/recipes";

import { useFloatingPanelStore } from "@/features/control/floating-panel-store";

defineOptions({ name: "FloatingPanelHost" });
const store = useFloatingPanelStore();
const dialogClasses = dialog({ placement: "center", size: "md" });
</script>
<template>
  <DialogRoot :open="store.panels.length > 0">
    <DialogPositioner :class="dialogClasses.positioner"><DialogContent :class="dialogClasses.content"><div v-if="store.panels.length > 0">{{ store.panels[store.panels.length - 1]?.title }}</div></DialogContent></DialogPositioner>
  </DialogRoot>
</template>
