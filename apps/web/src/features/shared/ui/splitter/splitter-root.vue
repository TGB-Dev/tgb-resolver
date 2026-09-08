<script setup lang="ts">
import { computed, provide, ref, useId, useTemplateRef, watch } from "vue";

import { SplitterContextKey, type SplitterContextValue, type SplitterPanelConfig } from "./context";

const props = withDefaults(
  defineProps<{
    orientation?: "horizontal";
    defaultSize?: [number | string, number | string];
    panels?: [SplitterPanelConfig, SplitterPanelConfig];
    id?: string;
  }>(),
  {
    orientation: "horizontal",
    defaultSize: undefined,
    panels: undefined,
    id: undefined,
  },
);

const rootId = props.id ?? `splitter:${useId()}`;
const rootRef = useTemplateRef<HTMLElement>("rootRef");

function parseSize(v: number | string | undefined): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "number") return v;
  const trimmed = v.trim();
  const m = trimmed.match(/^(-?\d*\.?\d+)(%|px)?$/);
  if (m == null) return undefined;
  const captured = m[1];
  if (captured == null) return undefined;
  const n = Number.parseFloat(captured);
  return Number.isFinite(n) ? n : undefined;
}

function toNumberSizes(arr: (number | string)[] | undefined, fallbackLen: number): [number, number] {
  if (arr == null || arr.length === 0) {
    const each = 100 / fallbackLen;
    return [each, 100 - each];
  }
  const a = parseSize(arr[0]) ?? 50;
  const b = parseSize(arr[1]) ?? 50;
  const sum = a + b;
  if (sum === 0) return [50, 50];
  if (Math.abs(sum - 100) > 0.01) {
    return [(a / sum) * 100, (b / sum) * 100];
  }
  return [a, b];
}

const panelsRef = computed(() => {
  if (props.panels) return props.panels;
  return [
    { id: "a" },
    { id: "b" },
  ] as [SplitterPanelConfig, SplitterPanelConfig];
});

const sizes = ref<[number, number]>(toNumberSizes(props.defaultSize, 2));

watch(panelsRef, () => {
  if (panelsRef.value.length !== 2) return;
  const curLen = sizes.value.length;
  if (curLen !== 2) {
    sizes.value = toNumberSizes(props.defaultSize, 2);
  }
});

const draggingId = ref<string | null>(null);
const isDragging = computed(() => draggingId.value != null);

let dragState: {
  id: string;
  startX: number;
  startSizes: [number, number];
} | null = null;

function clampDelta(delta: number, current: [number, number]): number {
  const beforePanel = panelsRef.value[0];
  const afterPanel = panelsRef.value[1];
  const beforeMin = beforePanel ? (parseSize(beforePanel.minSize) ?? 0) : 0;
  const afterMin = afterPanel ? (parseSize(afterPanel.minSize) ?? 0) : 0;
  const sBefore = current[0] ?? 50;
  const sAfter = current[1] ?? 50;
  const minDelta = beforeMin - sBefore;
  const maxDelta = sAfter - afterMin;
  if (delta < minDelta) return minDelta;
  if (delta > maxDelta) return maxDelta;
  return delta;
}

function startDrag(id: string, point: { x: number; y: number }) {
  draggingId.value = id;
  dragState = {
    id,
    startX: point.x,
    startSizes: [...sizes.value] as [number, number],
  };
  const onMove = (e: PointerEvent) => {
    if (dragState == null) return;
    const rootEl = rootRef.value;
    if (rootEl == null) return;
    const rect = rootEl.getBoundingClientRect();
    const groupSize = rect.width;
    if (groupSize <= 0) return;
    const offsetPx = e.clientX - dragState.startX;
    const delta = (offsetPx / groupSize) * 100;
    const clamped = clampDelta(delta, dragState.startSizes);
    const s0 = dragState.startSizes[0] ?? 50;
    const s1 = dragState.startSizes[1] ?? 50;
    sizes.value = [s0 + clamped, s1 - clamped];
  };
  const onUp = () => {
    draggingId.value = null;
    dragState = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
}

function updateKeyboardDelta(_id: string, delta: number) {
  const cur: [number, number] = [...sizes.value] as [number, number];
  const clamped = clampDelta(delta, cur);
  const c0 = cur[0] ?? 50;
  const c1 = cur[1] ?? 50;
  sizes.value = [c0 + clamped, c1 - clamped];
}

provide<SplitterContextValue>(SplitterContextKey, {
  panels: panelsRef as SplitterContextValue["panels"],
  sizes,
  rootId,
  rootEl: rootRef,
  draggingId,
  isDragging,
  getPanelIndex: (id: string) => panelsRef.value.findIndex((p) => p.id === id),
  startDrag,
  updateKeyboardDelta,
});
</script>

<template>
  <div
    ref="rootRef"
    :id="rootId"
    data-scope="splitter"
    data-part="root"
    data-orientation="horizontal"
    :data-dragging="isDragging ? '' : undefined"
    :style="{
      display: 'flex',
      flexDirection: 'row',
      height: '100%',
      width: '100%',
      overflow: 'hidden',
    }"
  >
    <slot />
  </div>
</template>
