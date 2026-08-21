<script setup lang="ts">
import { Splitter } from "@ark-ui/vue";
import { CalendarPlus, FileInput, Puzzle, ScanSearch } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { splitter } from "@styled-system/recipes";
import { useIntervalFn } from "@vueuse/core";

import ControlConfirmDialog from "@/features/control/control-confirm-dialog.vue";
import { useControlNowStore } from "@/features/control/control-now-store";
import FloatingPanelHost from "@/features/control/floating-panel-host.vue";
import { FloatingPanelType } from "@/features/control/floating-panel-types";
import ControlMainPanel from "@/features/control/panels/control-main-panel.vue";
import ControlTimelinePanel from "@/features/control/panels/control-timeline-panel.vue";
import ControlStatusBar from "@/features/control/status-bar/control-status-bar.vue";
import { getServerNow } from "@/lib/realtime-client";

const controlNowStore = useControlNowStore();
const splitterClasses = splitter();

useIntervalFn(() => controlNowStore.setNow(getServerNow()), 200);

const root = css({
  display: "flex",
  flexDirection: "column",
  h: "100vh",
  maxH: "100vh",
  w: "100vw",
  maxW: "100vw",
  overflow: "hidden",
});
const splitterRoot = cx(splitterClasses.root, css({ flex: 1, minH: 0 }));
</script>

<template>
  <div :class="root">
    <ControlStatusBar />

    <Splitter.Root
      :class="splitterRoot"
      orientation="horizontal"
      :defaultSize="[55, 45]"
      :panels="[
        { id: 'main', minSize: 35 },
        { id: 'timeline', minSize: 45 },
      ]"
    >
      <Splitter.Panel id="main" :minSize="35" :class="splitterClasses.panel">
        <ControlMainPanel />
      </Splitter.Panel>

      <Splitter.ResizeTrigger
        id="main:timeline"
        :class="splitterClasses.resizeTrigger"
        aria-label="resize main and timeline panels"
      >
        <div :class="splitterClasses.resizeTriggerSeparator" />
        <Splitter.ResizeTriggerIndicator :class="splitterClasses.resizeTriggerIndicator" />
      </Splitter.ResizeTrigger>

      <Splitter.Panel id="timeline" :minSize="45" :class="splitterClasses.panel">
        <ControlTimelinePanel />
      </Splitter.Panel>
    </Splitter.Root>

    <ControlConfirmDialog />
    <FloatingPanelHost>
      <template #icon="{ type }">
        <ScanSearch v-if="type === FloatingPanelType.InspectShow" :size="16" aria-hidden />
        <FileInput v-else-if="type === FloatingPanelType.ImportShow" :size="16" aria-hidden />
        <CalendarPlus v-else-if="type === FloatingPanelType.CreateEvent" :size="16" aria-hidden />
        <Puzzle v-else :size="16" aria-hidden />
      </template>
    </FloatingPanelHost>
  </div>
</template>
