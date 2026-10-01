<script setup lang="ts">
import { css } from "@styled-system/css";
import { nextTick, useTemplateRef, watch } from "vue";

import { useControlIsLive } from "@/features/control/composables/use-show";
import {
  ControlEditMainPanelTab,
  useControlEditMainPanelStore,
} from "@/features/control/control-edit-main-panel-store";
import ControlEditMainPanel from "@/features/control/panels/main/control-edit-main-panel.vue";
import ControlLiveMainPanel from "@/features/control/panels/main/control-live-main-panel.vue";
import ControlMainControls from "@/features/control/panels/main/control-main-controls.vue";

const isLive = useControlIsLive();
const panelStore = useControlEditMainPanelStore();
const livePanel = useTemplateRef<{ focusDefaultTab: () => void }>("livePanel");
const editPanel = useTemplateRef<{ focusDefaultTab: () => void }>("editPanel");

watch(isLive, (live) => {
  panelStore.setActiveTab(live ? ControlEditMainPanelTab.Cue : ControlEditMainPanelTab.Preview);
  void nextTick(() => {
    (live ? livePanel.value : editPanel.value)?.focusDefaultTab();
  });
});
</script>

<template>
  <div
    :class="
      css({
        display: 'grid',
        gridTemplateRows: '1fr auto',
        h: 'full',
        minH: 0,
        overflow: 'hidden',
      })
    "
  >
    <ControlLiveMainPanel v-if="isLive" ref="livePanel" />
    <ControlEditMainPanel v-else ref="editPanel" />
    
    <ControlMainControls />
  </div>
</template>
