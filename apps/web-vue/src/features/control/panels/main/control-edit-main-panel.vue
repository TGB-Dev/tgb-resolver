<script setup lang="ts">
import { Tabs } from "@ark-ui/vue";
import { Images, Info, Logs, ScanEye, Settings } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
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
  <Tabs.Root
    v-model="activeTab"
    :class="
      cx(
        tabClasses.root,
        css({
          h: 'full',
          minH: 0,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateRows: 'auto 1fr',
        }),
      )
    "
    defaultValue="preview"
  >
    <Tabs.List :class="tabClasses.list">
      <Tabs.Trigger value="preview" :class="tabClasses.trigger">
        <ScanEye :size="16" aria-hidden />
        Preview
      </Tabs.Trigger>
      <Tabs.Trigger value="assets" :class="tabClasses.trigger">
        <Images :size="16" aria-hidden />
        Assets
      </Tabs.Trigger>
      <Tabs.Trigger value="cue" :class="tabClasses.trigger">
        <Logs :size="16" aria-hidden />
        Cue
      </Tabs.Trigger>
      <Tabs.Trigger value="info" :class="tabClasses.trigger">
        <Info :size="16" aria-hidden />
        Info
      </Tabs.Trigger>
      <Tabs.Trigger value="settings" :class="tabClasses.trigger">
        <Settings :size="16" aria-hidden />
        Settings
      </Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content value="preview" :class="cx(tabClasses.content, css({ minH: 0 }))">
      <ControlMainPreviewTab />
    </Tabs.Content>
    <Tabs.Content value="assets" :class="tabClasses.content">
      <ControlMainAssetsTab />
    </Tabs.Content>
    <Tabs.Content value="cue" :class="tabClasses.content">
      <ControlMainCueTab />
    </Tabs.Content>
    <Tabs.Content value="info" :class="tabClasses.content">
      <ControlMainInfoTab />
    </Tabs.Content>
    <Tabs.Content value="settings" :class="tabClasses.content">
      <ControlMainSettingsTab />
    </Tabs.Content>
  </Tabs.Root>
</template>
