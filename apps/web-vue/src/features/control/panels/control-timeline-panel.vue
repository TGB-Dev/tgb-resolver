<script setup lang="ts">
import { css } from "@styled-system/css";
import { ref } from "vue";

import ControlTimelineControls from "@/features/control/panels/timeline/control-timeline-controls.vue";
import ControlTimelineTable from "@/features/control/timeline/timeline-table.vue";

const timelineTableRef = ref<InstanceType<typeof ControlTimelineTable> | null>(null);
</script>

<template>
  <div
    :class="
      css({
        display: 'grid',
        gridTemplateRows: '1fr auto',
        h: 'full',
        minH: 0,
      })
    "
  >
    <ControlTimelineTable ref="timelineTableRef" />
    <ControlTimelineControls :onJumpToCurrent="() => timelineTableRef?.scrollToCurrent()" />
  </div>
</template>
