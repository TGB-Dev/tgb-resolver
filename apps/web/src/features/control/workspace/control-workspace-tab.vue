<script setup lang="ts">
import { Images, Info, Lock, Logs, ScanEye, Settings, Timeline, X } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { button, iconButton } from "@styled-system/recipes";
import type { IDockviewPanelHeaderProps } from "dockview-vue";
import { computed } from "vue";

import { CONTROL_VIEW_BY_ID, CONTROL_VIEW_TITLES, ControlViewType } from "./control-workspace-types";

const CONTROL_VIEW_ICONS = {
  [ControlViewType.Preview]: ScanEye,
  [ControlViewType.Assets]: Images,
  [ControlViewType.Cue]: Logs,
  [ControlViewType.Info]: Info,
  [ControlViewType.Settings]: Settings,
  [ControlViewType.Auth]: Lock,
  [ControlViewType.Timeline]: Timeline,
};

const props = defineProps<IDockviewPanelHeaderProps>();

const viewType = computed(() => CONTROL_VIEW_BY_ID[props.api.id]);
const icon = computed(() => (viewType.value ? CONTROL_VIEW_ICONS[viewType.value] : undefined));
const title = computed(
  () => (viewType.value ? CONTROL_VIEW_TITLES[viewType.value] : props.api.title) ?? "",
);
const closable = computed(() => viewType.value !== ControlViewType.Timeline);

const root = css({
  display: "flex",
  alignItems: "center",
  gap: "1.5",
  h: "full",
  minW: 0,
});
const iconFrame = css({ display: "flex", alignItems: "center", justifyContent: "center", boxSize: "5", flexShrink: 0 });
const tabIcon = css({ boxSize: "1cap", flexShrink: 0 });
const label = css({ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });
const closeClass = cx(
  button({ variant: "ghost", size: "sm" }),
  iconButton(),
  css({ boxSize: "5", minW: "5", p: "0", flexShrink: 0, fontSize: "inherit", color: "fg.muted", _hover: { color: "fg" }, "& svg": { boxSize: "1cap" } }),
);

function close(): void {
  props.api.close();
}
</script>

<template>
  <div :class="root">
    <span v-if="icon" :class="iconFrame"><component :is="icon" :class="tabIcon" aria-hidden /></span>
    <span :class="label">{{ title }}</span>
    <button
      v-if="closable"
      type="button"
      :class="closeClass"
      :aria-label="`Close ${title}`"
      @pointerdown.stop
      @click.stop="close"
    >
      <X :class="tabIcon" aria-hidden />
    </button>
  </div>
</template>
