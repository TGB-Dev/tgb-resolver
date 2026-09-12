<script setup lang="ts">
import { Tabs } from "@ark-ui/vue";
import { Images, Info, Lock, Logs, ScanEye, Settings } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { tabs } from "@styled-system/recipes";

import { useControlEditMainPanelStore } from "@/features/control/control-edit-main-panel-store";
import ControlMainAssetsTab from "@/features/control/panels/main/tabs/control-main-assets-tab.vue";
import ControlMainAuthTab from "@/features/control/panels/main/tabs/control-main-auth-tab.vue";
import ControlMainCueTab from "@/features/control/panels/main/tabs/control-main-cue-tab.vue";
import ControlMainInfoTab from "@/features/control/panels/main/tabs/control-main-info-tab.vue";
import ControlMainPreviewTab from "@/features/control/panels/main/tabs/control-main-preview-tab.vue";
import ControlMainSettingsTab from "@/features/control/panels/main/tabs/control-main-settings-tab.vue";

const panelStore = useControlEditMainPanelStore();
const tabClasses = tabs({ variant: "line", size: "sm" });
</script>

<template>
  <Tabs.Root
    v-model="panelStore.activeTab"
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
      <Tabs.Trigger value="auth" :class="tabClasses.trigger">
        <Lock :size="16" aria-hidden />
        Auth
      </Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content
      value="preview"
      :class="cx(tabClasses.content, css({ minH: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }))"
    >
      <ControlMainPreviewTab />
    </Tabs.Content>
    <Tabs.Content
      value="assets"
      :class="cx(tabClasses.content, css({ minH: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }))"
    >
      <ControlMainAssetsTab />
    </Tabs.Content>
    <Tabs.Content
      value="cue"
      :class="cx(tabClasses.content, css({ minH: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }))"
    >
      <ControlMainCueTab />
    </Tabs.Content>
    <Tabs.Content
      value="info"
      :class="cx(tabClasses.content, css({ minH: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }))"
    >
      <ControlMainInfoTab />
    </Tabs.Content>
    <Tabs.Content
      value="settings"
      :class="cx(tabClasses.content, css({ minH: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }))"
    >
      <ControlMainSettingsTab />
    </Tabs.Content>
    <Tabs.Content
      value="auth"
      :class="cx(tabClasses.content, css({ minH: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }))"
    >
      <ControlMainAuthTab />
    </Tabs.Content>
  </Tabs.Root>
</template>
