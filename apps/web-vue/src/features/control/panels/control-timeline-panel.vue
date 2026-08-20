<script setup lang="ts">
import { Grid } from "@styled-system/jsx";

import ControlTimelineControls from "@/features/control/panels/timeline/control-timeline-controls.vue";
import ControlTimelineTable from "@/features/control/timeline/timeline-table.vue";
</script>

<template>
  <Grid templateRows="1fr auto" h="full">
    <ControlTimelineTable />
    <ControlTimelineControls />
  </Grid>
</template>
