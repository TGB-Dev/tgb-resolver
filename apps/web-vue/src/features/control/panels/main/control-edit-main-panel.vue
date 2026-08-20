<script setup lang="ts">
import { TabContent, TabList, TabsRoot, TabTrigger } from "@ark-ui/vue";
import { Images, Info, Logs, ScanEye, Settings } from "@lucide/vue";
import { tabs } from "@styled-system/recipes";
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
const tabClasses = tabs({ variant: "line", size: "sm" });

useHotkey("Mod+1", () => (activeTab.value = ControlEditMainPanelTabs.PREVIEW));
useHotkey("Mod+2", () => (activeTab.value = ControlEditMainPanelTabs.ASSETS));
useHotkey("Mod+3", () => (activeTab.value = ControlEditMainPanelTabs.CUE));
useHotkey("Mod+4", () => (activeTab.value = ControlEditMainPanelTabs.INFO));
useHotkey("Mod+5", () => (activeTab.value = ControlEditMainPanelTabs.SETTINGS));
</script>

<template>
  <TabsRoot v-model="activeTab" :class="tabClasses.root" defaultValue="preview">
    <TabList :class="tabClasses.list">
      <TabTrigger value="preview" :class="tabClasses.trigger">
        <ScanEye :size="16" aria-hidden />
        Preview
      </TabTrigger>
      <TabTrigger value="assets" :class="tabClasses.trigger">
        <Images :size="16" aria-hidden />
        Assets
      </TabTrigger>
      <TabTrigger value="cue" :class="tabClasses.trigger">
        <Logs :size="16" aria-hidden />
        Cue
      </TabTrigger>
      <TabTrigger value="info" :class="tabClasses.trigger">
        <Info :size="16" aria-hidden />
        Info
      </TabTrigger>
      <TabTrigger value="settings" :class="tabClasses.trigger">
        <Settings :size="16" aria-hidden />
        Settings
      </TabTrigger>
    </TabList>

    <TabContent value="preview" :class="tabClasses.content">
      <ControlMainPreviewTab />
    </TabContent>
    <TabContent value="assets" :class="tabClasses.content">
      <ControlMainAssetsTab />
    </TabContent>
    <TabContent value="cue" :class="tabClasses.content">
      <ControlMainCueTab />
    </TabContent>
    <TabContent value="info" :class="tabClasses.content">
      <ControlMainInfoTab />
    </TabContent>
    <TabContent value="settings" :class="tabClasses.content">
      <ControlMainSettingsTab />
    </TabContent>
  </TabsRoot>
</template>
