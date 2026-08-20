<script setup lang="ts">
import { Grid } from "@styled-system/jsx";
import { ref } from "vue";

import ControlTimelineControls from "@/features/control/panels/timeline/control-timeline-controls.vue";
import ControlTimelineTable from "@/features/control/timeline/timeline-table.vue";

const timelineTableRef = ref<InstanceType<typeof ControlTimelineTable> | null>(null);
</script>

<template>
  <Grid templateRows="1fr auto" h="full">
    <ControlTimelineTable ref="timelineTableRef" />
    <ControlTimelineControls
      :onJumpToCurrent="() => timelineTableRef?.scrollToCurrent()"
    />
  </Grid>
</template>
