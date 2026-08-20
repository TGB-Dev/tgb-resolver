<script setup lang="ts">
import { TabContent, TabList, TabsRoot, TabTrigger } from "@ark-ui/vue";
import { Images, Info, Logs, ScanEye, Settings } from "@lucide/vue";
import { useHotkey } from "@tanstack/vue-hotkeys";
import { ref } from "vue";

import ControlMainAssetsTab from "@/features/control/panels/main/tabs/control-main-assets-tab.vue";
import ControlMainCueTab from "@/features/control/panels/main/tabs/control-main-cue-tab.vue";
import ControlMainInfoTab from "@/features/control/panels/main/tabs/control-main-info-tab.vue";
import ControlMainPreviewTab from "@/features/control/panels/main/tabs/control-main-preview-tab.vue";
import ControlMainSettingsTab from "@/features/control/panels/main/tabs/control-main-settings-tab.vue";

enum ControlEditMainPanelTabs {
  PREVIEW = "preview",
  ASSETS = "assets",
  CUE = "cue",
  INFO = "info",
  SETTINGS = "settings",
}

const activeTab = ref<ControlEditMainPanelTabs>(ControlEditMainPanelTabs.PREVIEW);

useHotkey("Mod+1", () => (activeTab.value = ControlEditMainPanelTabs.PREVIEW));
useHotkey("Mod+2", () => (activeTab.value = ControlEditMainPanelTabs.ASSETS));
useHotkey("Mod+3", () => (activeTab.value = ControlEditMainPanelTabs.CUE));
useHotkey("Mod+4", () => (activeTab.value = ControlEditMainPanelTabs.INFO));
useHotkey("Mod+5", () => (activeTab.value = ControlEditMainPanelTabs.SETTINGS));
</script>

<template>
  <TabsRoot v-model="activeTab" class="tgb-edit-tabs" defaultValue="preview">
    <TabList class="tgb-edit-tabs-list">
      <TabTrigger value="preview">
        <ScanEye :size="16" aria-hidden />
        Preview
      </TabTrigger>
      <TabTrigger value="assets">
        <Images :size="16" aria-hidden />
        Assets
      </TabTrigger>
      <TabTrigger value="cue">
        <Logs :size="16" aria-hidden />
        Cue
      </TabTrigger>
      <TabTrigger value="info">
        <Info :size="16" aria-hidden />
        Info
      </TabTrigger>
      <TabTrigger value="settings">
        <Settings :size="16" aria-hidden />
        Settings
      </TabTrigger>
    </TabList>

    <TabContent value="preview" class="tgb-edit-tabs-content">
      <ControlMainPreviewTab />
    </TabContent>
    <TabContent value="assets" class="tgb-edit-tabs-content">
      <ControlMainAssetsTab />
    </TabContent>
    <TabContent value="cue" class="tgb-edit-tabs-content">
      <ControlMainCueTab />
    </TabContent>
    <TabContent value="info" class="tgb-edit-tabs-content">
      <ControlMainInfoTab />
    </TabContent>
    <TabContent value="settings" class="tgb-edit-tabs-content">
      <ControlMainSettingsTab />
    </TabContent>
  </TabsRoot>
</template>

<style scoped>
.tgb-edit-tabs {
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.tgb-edit-tabs-list {
  display: flex;
  gap: 0.125rem;
  padding-inline: 0.5rem;
  border-bottom: 1px solid var(--colors-border-muted);
}

.tgb-edit-tabs-list [data-part="trigger"] {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: var(--colors-fg-muted);
  cursor: pointer;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
}

.tgb-edit-tabs-list [data-part="trigger"][data-selected] {
  color: var(--colors-fg);
  border-bottom-color: var(--colors-color-palette-600);
}

.tgb-edit-tabs-content {
  min-height: 0;
  height: 100%;
  overflow: auto;
}
</style>
