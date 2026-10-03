<script setup lang="ts">
import "@danfessler/trellis/style.css";


import { createWorkspace } from "@danfessler/trellis";
import { css } from "@styled-system/css";
import { onMounted, onUnmounted, useTemplateRef, watch } from "vue";

import { useControlIsLive } from "@/features/control/composables/use-show";
import { useColorMode } from "@/features/shared/ui/color-mode";
import { ColorMode } from "@/stores/color-mode-store";

import { clampStageShare } from "./clamp-stage-share";
import { useControlWorkspaceStore } from "./control-workspace-store";
import {
  CONTROL_VIEW_IDS,
  CONTROL_WORKSPACE_STORAGE_KEY,
  CONTROL_WORKSPACE_VERSION,
  ControlViewType,
  EDIT_ONLY_VIEWS,
} from "./control-workspace-types";
import {
  buildControlDefaultLayout,
  buildControlViewTypes,
  CONTROL_WORKSPACE_TOKENS,
} from "./control-workspace-views";

const store = useControlWorkspaceStore();
const { colorMode } = useColorMode();
const isLive = useControlIsLive();
const host = useTemplateRef<HTMLElement>("host");

const hostClass = css({ flex: 1, minH: 0, position: "relative" });

function syncLiveViews(live: boolean): void {
  const workspace = store.workspace;
  if (!workspace) return;
  if (live) {
    for (const type of EDIT_ONLY_VIEWS) void workspace.close(CONTROL_VIEW_IDS[type]);
  } else {
    for (const type of EDIT_ONLY_VIEWS) {
      const id = CONTROL_VIEW_IDS[type];
      if (!workspace.view(id)) workspace.open(type, { id, focus: false });
    }
    store.focusView(ControlViewType.Preview);
  }
  if (live) store.focusView(ControlViewType.Cue);
}

onMounted(() => {
  if (!host.value) return;
  const workspace = createWorkspace(host.value, {
    theme: colorMode.value === ColorMode.Dark ? "dark" : "light",
    navigation: "focus",
    types: buildControlViewTypes(),
    defaultLayout: buildControlDefaultLayout(),
    persist: { key: CONTROL_WORKSPACE_STORAGE_KEY, version: CONTROL_WORKSPACE_VERSION },
    tokens: CONTROL_WORKSPACE_TOKENS,
  });
  store.attach(workspace);
  if (isLive.value) syncLiveViews(true);

  offChange = workspace.on("change", (document) => {
    const stageWidth = workspace.getLayoutRects().get("stage")?.rect.w ?? 1;
    const clamped = clampStageShare(document, stageWidth);
    if (clamped) workspace.setDocument(clamped);
  });
});

watch(colorMode, (mode) => {
  store.workspace?.update({ theme: mode === ColorMode.Dark ? "dark" : "light" });
});
watch(isLive, (live) => syncLiveViews(live));

let offChange: (() => void) | null = null;

onUnmounted(() => {
  offChange?.();
  offChange = null;
  store.workspace?.destroy();
  store.detach();
});
</script>

<template>
  <div ref="host" :class="hostClass" />
</template>
