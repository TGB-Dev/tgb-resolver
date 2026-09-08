<script setup lang="ts">
import { computed, inject, ref } from "vue";

import { SplitterContextKey } from "./context";

const props = withDefaults(
  defineProps<{
    id: string;
    disabled?: boolean;
  }>(),
  { disabled: false },
);

const ctxRaw = inject(SplitterContextKey);
if (ctxRaw == null) throw new Error("Splitter.ResizeTrigger must be inside Splitter.Root");
const ctx = ctxRaw;

const focused = ref(false);
const isDragging = computed(() => ctx.draggingId.value === props.id);
const isFocused = computed(() => focused.value || isDragging.value);

function getAria(): { valueNow: number; valueMin: number; valueMax: number; primaryId: string | undefined } {
  const panels = ctx.panels.value;
  const primary = panels[0];
  const secondary = panels[1];
  const sizes = ctx.sizes.value;
  const vNow = sizes[0] ?? 50;
  const rawMin = primary?.minSize;
  const rawMaxSecondaryMin = secondary?.minSize;
  const vMin = typeof rawMin === "number" ? rawMin : Number.parseFloat(String(rawMin ?? 0)) || 0;
  const secondaryMin = typeof rawMaxSecondaryMin === "number" ? rawMaxSecondaryMin : Number.parseFloat(String(rawMaxSecondaryMin ?? 0)) || 0;
  const vMax = 100 - secondaryMin;
  return { valueNow: Math.round(vNow), valueMin: vMin, valueMax: vMax, primaryId: primary?.id };
}

const aria = computed(() => getAria());

function onPointerDown(e: PointerEvent) {
  if (props.disabled) return;
  if (e.button !== 0) return;
  const target = e.currentTarget;
  if (target instanceof HTMLElement) {
    target.focus();
    target.setPointerCapture(e.pointerId);
  }
  ctx.startDrag(props.id, { x: e.clientX, y: e.clientY });
  e.preventDefault();
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: window splitter keyboard per WAI-ARIA APG
function onKeyDown(e: KeyboardEvent) {
  if (props.disabled) return;
  const step = 1;
  const deltaSmall = e.shiftKey ? 10 : step;
  let delta: number | null = null;
  switch (e.key) {
    case "ArrowLeft":
      delta = -deltaSmall;
      break;
    case "ArrowRight":
      delta = deltaSmall;
      break;
    case "Home":
      delta = -100;
      break;
    case "End":
      delta = 100;
      break;
    case "F6": {
      const triggers = Array.from(document.querySelectorAll<HTMLElement>(`[data-scope="splitter"][data-part="resize-trigger"]`));
      const idx = triggers.findIndex((el) => el.dataset.id === props.id);
      const atStart = idx <= 0;
      const atEnd = idx >= triggers.length - 1;
      if (triggers.length <= 1) {
        e.preventDefault();
        return;
      }
      const nextIdx = e.shiftKey ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= triggers.length) {
        e.preventDefault();
        return;
      }
      if (atStart && e.shiftKey) {
        e.preventDefault();
        return;
      }
      if (atEnd && !e.shiftKey) {
        e.preventDefault();
        return;
      }
      const next = triggers[nextIdx];
      if (next) next.focus();
      e.preventDefault();
      return;
    }
    default:
      return;
  }
  if (delta != null) {
    ctx.updateKeyboardDelta(props.id, delta);
    e.preventDefault();
  }
}
</script>

<template>
  <!-- biome-ignore lint/a11y/useSemanticElements: splitter trigger requires div with separator role for resizable panel a11y -->
  <div
    :id="`${ctx.rootId}:resize-trigger:${id}`"
    data-scope="splitter"
    data-part="resize-trigger"
    role="separator"
    :data-id="id"
    :data-ownedby="ctx.rootId"
    data-orientation="horizontal"
    aria-orientation="horizontal"
    :data-dragging="isDragging ? '' : undefined"
    :data-focus="isFocused ? '' : undefined"
    :data-disabled="disabled ? '' : undefined"
    :tabindex="disabled ? undefined : 0"
    :aria-valuenow="aria.valueNow"
    :aria-valuemin="aria.valueMin"
    :aria-valuemax="aria.valueMax"
    :aria-controls="aria.primaryId ? `${ctx.rootId}:panel:${aria.primaryId}` : undefined"
    :style="{
      touchAction: 'none',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      flex: '0 0 auto',
      pointerEvents: disabled ? 'none' : isDragging && !focused ? 'none' : undefined,
      cursor: disabled ? undefined : 'col-resize',
      minHeight: '0',
    }"
    @pointerdown="onPointerDown"
    @focus="focused = true"
    @blur="focused = false"
    @keydown="onKeyDown"
  >
    <slot />
  </div>
</template>
