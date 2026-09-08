<script setup lang="ts">
import { computed, inject } from "vue";

import { SplitterContextKey } from "./context";

const props = defineProps<{
  id: string;
  minSize?: number | string;
}>();

const ctxRaw = inject(SplitterContextKey);
if (ctxRaw == null) throw new Error("Splitter.Panel must be inside Splitter.Root");
const ctx = ctxRaw;

const index = computed(() => ctx.getPanelIndex(props.id));
const size = computed(() => {
  const i = index.value;
  if (i < 0 || i > 1) return undefined;
  const s = ctx.sizes.value;
  return s[i as 0 | 1];
});
const isDragging = computed(() => ctx.isDragging.value);

function parseSize(v: number | string | undefined): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "number") return `${v}%`;
  const trimmed = v.trim();
  if (trimmed.endsWith("%")) return trimmed;
  const n = Number.parseFloat(trimmed);
  return Number.isFinite(n) ? `${n}%` : undefined;
}

const panelStyle = computed(() => {
  const s = size.value;
  const cfgMin = parseSize(props.minSize);
  const panels = ctx.panels.value;
  const idx = index.value;
  const ctxPanel = idx >= 0 ? panels[idx] : undefined;
  const ctxMin = parseSize(ctxPanel?.minSize);
  const minSize = cfgMin ?? ctxMin;
  const flexGrow = s != null ? Number(s.toFixed(3)).toString() : "1";
  const style: Record<string, string | undefined> = {
    flexBasis: "0",
    flexGrow,
    flexShrink: "1",
    overflow: "hidden",
    pointerEvents: isDragging.value ? "none" : undefined,
  };
  if (minSize) style.minWidth = minSize;
  return style;
});
</script>

<template>
  <div
    :id="`${ctx.rootId}:panel:${id}`"
    data-scope="splitter"
    data-part="panel"
    data-orientation="horizontal"
    :data-dragging="isDragging ? '' : undefined"
    :data-ownedby="ctx.rootId"
    :data-id="id"
    :data-index="index"
    :style="panelStyle"
  >
    <slot />
  </div>
</template>
