<script setup lang="ts">
import { Grid } from "@styled-system/jsx";

import { useControlIsLive } from "@/features/control/composables/use-show";
import ControlEditMainPanel from "@/features/control/panels/main/control-edit-main-panel.vue";
import ControlLiveMainPanel from "@/features/control/panels/main/control-live-main-panel.vue";
import ControlMainControls from "@/features/control/panels/main/control-main-controls.vue";

const isLive = useControlIsLive();
</script>

<template>
  <Grid templateRows="1fr auto" h="full">
    <ControlLiveMainPanel v-if="isLive" />
    <ControlEditMainPanel v-else />
    <ControlMainControls />
  </Grid>
</template>
