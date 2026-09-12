<script setup lang="ts">
import { Tabs } from "@ark-ui/vue";
import { Lock, Logs } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { tabs } from "@styled-system/recipes";

import { useControlEditMainPanelStore } from "@/features/control/control-edit-main-panel-store";
import ControlMainAuthTab from "@/features/control/panels/main/tabs/control-main-auth-tab.vue";
import ControlMainCueTab from "@/features/control/panels/main/tabs/control-main-cue-tab.vue";

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
    defaultValue="cue"
  >
    <Tabs.List :class="tabClasses.list">
      <Tabs.Trigger value="cue" :class="tabClasses.trigger">
        <Logs :size="16" aria-hidden />
        Cue
      </Tabs.Trigger>
      <Tabs.Trigger value="auth" :class="tabClasses.trigger">
        <Lock :size="16" aria-hidden />
        Auth
      </Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content
      value="cue"
      :class="cx(tabClasses.content, css({ minH: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }))"
    >
      <ControlMainCueTab />
    </Tabs.Content>
    <Tabs.Content
      value="auth"
      :class="cx(tabClasses.content, css({ minH: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }))"
    >
      <ControlMainAuthTab />
    </Tabs.Content>
  </Tabs.Root>
</template>
