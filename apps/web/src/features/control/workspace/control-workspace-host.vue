<script setup lang="ts">
import { css } from "@styled-system/css";
import { type DockviewReadyEvent, DockviewVue } from "dockview-vue";
import { onUnmounted, useTemplateRef, watch } from "vue";

import { useControlIsLive } from "@/features/control/composables/use-show";
import ControlMainAssetsTab from "@/features/control/panels/main/tabs/control-main-assets-tab.vue";
import ControlMainAuthTab from "@/features/control/panels/main/tabs/control-main-auth-tab.vue";
import ControlMainCueTab from "@/features/control/panels/main/tabs/control-main-cue-tab.vue";
import ControlMainInfoTab from "@/features/control/panels/main/tabs/control-main-info-tab.vue";
import ControlMainPreviewTab from "@/features/control/panels/main/tabs/control-main-preview-tab.vue";
import ControlMainSettingsTab from "@/features/control/panels/main/tabs/control-main-settings-tab.vue";

import ControlTimelineView from "./control-timeline-view.vue";
import { useControlWorkspaceStore } from "./control-workspace-store";
import ControlWorkspaceTab from "./control-workspace-tab.vue";
import { controlWorkspaceTheme } from "./control-workspace-theme";
import {
  CONTROL_VIEW_IDS,
  ControlViewType,
  INITIAL_STAGE_SHARE,
  stageMinimumWidth,
} from "./control-workspace-types";
import { buildDefaultWorkspace, closeEditOnlyViews, ensureMainViews } from "./control-workspace-views";

const storageKey = "tgb-control-dockview";
const host = useTemplateRef<HTMLElement>("host");
const store = useControlWorkspaceStore();
const isLive = useControlIsLive();
const hostClass = css({ flex: 1, minH: 0, minW: 0, position: "relative" });
let dispose: (() => void) | undefined;

function syncLiveViews(live: boolean): void {
  const api = store.workspace;
  if (!api) return;
  if (live) closeEditOnlyViews(api);
  else ensureMainViews(api);
  store.focusView(live ? ControlViewType.Cue : ControlViewType.Preview);
}

function onReady({ api }: DockviewReadyEvent): void {
  store.attach(api);
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) api.fromJSON(JSON.parse(saved));
    if (!api.getPanel(CONTROL_VIEW_IDS[ControlViewType.Timeline])) api.clear();
  } catch {
    api.clear();
  }
  if (!api.totalPanels) {
    buildDefaultWorkspace(api);
    api
      .getPanel(CONTROL_VIEW_IDS[ControlViewType.Timeline])
      ?.api.setSize({ width: api.width * INITIAL_STAGE_SHARE });
  }
  const timeline = api.getPanel(CONTROL_VIEW_IDS[ControlViewType.Timeline]);
  let timelineGroup = timeline?.group;
  timelineGroup?.api.setConstraints({ minimumWidth: stageMinimumWidth(api.width) });
  const timelineMoved = timeline?.api.onDidGroupChange(() => {
    timelineGroup?.api.setConstraints({ minimumWidth: 100 });
    timelineGroup = timeline.group;
    timelineGroup.api.setConstraints({ minimumWidth: stageMinimumWidth(host.value?.clientWidth ?? api.width) });
  });
  if (isLive.value) syncLiveViews(true);
  else ensureMainViews(api);
  const observer = new ResizeObserver(() => {
    timeline?.api.group.api.setConstraints({
      minimumWidth: stageMinimumWidth(host.value?.clientWidth ?? api.width),
    });
  });
  if (host.value) observer.observe(host.value);
  const layout = api.onDidLayoutChange(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(api.toJSON()));
    } catch {
      // Storage can be unavailable in private browsing.
    }
  });
  dispose = () => {
    observer.disconnect();
    timelineMoved?.dispose();
    layout.dispose();
  };
}

watch(isLive, syncLiveViews);
onUnmounted(() => {
  dispose?.();
  store.detach();
});
</script>

<template>
  <div ref="host" :class="hostClass">
    <DockviewVue
      :class="css({ w: 'full', h: 'full' })"
      :theme="controlWorkspaceTheme"
      :disable-floating-groups="true"
      @ready="onReady"
    >
      <template #panel-preview><ControlMainPreviewTab /></template>
      <template #panel-assets><ControlMainAssetsTab /></template>
      <template #panel-cue><ControlMainCueTab /></template>
      <template #panel-info><ControlMainInfoTab /></template>
      <template #panel-settings><ControlMainSettingsTab /></template>
      <template #panel-auth><ControlMainAuthTab /></template>
      <template #panel-timeline><ControlTimelineView /></template>
      <template #defaultTab="props"><ControlWorkspaceTab v-bind="props" /></template>
    </DockviewVue>
  </div>
</template>
