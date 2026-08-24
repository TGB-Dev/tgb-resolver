import { useEventListener } from "@vueuse/core";
import { type MaybeRefOrGetter, ref, toValue } from "vue";

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface ContainerHandlers {
  onPointerDown: (e: PointerEvent) => void;
  onPointerMove: (e: PointerEvent) => void;
  onPointerUp: (e: PointerEvent) => void;
  onClickCapture: (e: MouseEvent) => void;
}

interface HitEntry {
  id: string;
  el: HTMLElement;
}

export function useRubberBandSelect(
  containerRef: MaybeRefOrGetter<HTMLElement | null>,
  onSelect: (entryIds: string[], mod: boolean) => void,
) {
  const selectionRect = ref<Rect | null>(null);
  const isDragging = ref(false);
  const dragEndTime = ref(0);
  const startPoint = ref({ x: 0, y: 0 });
  const currentPoint = ref({ x: 0, y: 0 });
  const modKey = ref(false);

  function getEntryElements(): HitEntry[] {
    const container = toValue(containerRef);
    if (!container) return [];
    const entries: HitEntry[] = [];
    for (const el of container.querySelectorAll<HTMLElement>("[data-entry-id]")) {
      entries.push({ id: el.dataset.entryId ?? "", el });
    }
    return entries;
  }

  function hitTest(rect: Rect, entryEl: HTMLElement): boolean {
    const clientRect = entryEl.getBoundingClientRect();
    const overlapX = clientRect.left < rect.left + rect.width && clientRect.right > rect.left;
    const overlapY = clientRect.top < rect.top + rect.height && clientRect.bottom > rect.top;
    return overlapX && overlapY;
  }

  function computeRect(
    start: { x: number; y: number },
    current: { x: number; y: number },
  ): Rect | null {
    const x = Math.min(start.x, current.x);
    const y = Math.min(start.y, current.y);
    const w = Math.abs(current.x - start.x);
    const h = Math.abs(current.y - start.y);
    if (w < 4 && h < 4) return null;
    return { left: x, top: y, width: w, height: h };
  }

  function handlePointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-entry-id]")) return;
    if (target.closest("[data-context-menu-backdrop]")) return;

    isDragging.value = true;
    modKey.value = e.metaKey || e.ctrlKey;
    startPoint.value = { x: e.clientX, y: e.clientY };
    currentPoint.value = { x: e.clientX, y: e.clientY };
    selectionRect.value = null;

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore if pointer capture unsupported
    }
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging.value) return;
    currentPoint.value = { x: e.clientX, y: e.clientY };
    const rect = computeRect(startPoint.value, currentPoint.value);
    selectionRect.value = rect;

    if (rect) {
      const entries = getEntryElements();
      const selected = entries.filter((entry) => hitTest(rect, entry.el)).map((entry) => entry.id);
      onSelect(selected, modKey.value);
    } else {
      onSelect([], modKey.value);
    }
  }

  function handlePointerUp(e: PointerEvent) {
    if (!isDragging.value) return;
    isDragging.value = false;
    dragEndTime.value = Date.now();

    try {
      if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }

    const rect = computeRect(startPoint.value, currentPoint.value);
    selectionRect.value = null;

    if (rect) {
      const entries = getEntryElements();
      const selected = entries.filter((entry) => hitTest(rect, entry.el)).map((entry) => entry.id);
      onSelect(selected, modKey.value);
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && isDragging.value) {
      isDragging.value = false;
      selectionRect.value = null;
    }
  }

  useEventListener(window, "keydown", onKeyDown);

  function handleClickCapture(e: MouseEvent) {
    if (Date.now() - dragEndTime.value < 100) {
      e.stopPropagation();
      e.preventDefault();
    }
  }

  const containerHandlers: ContainerHandlers = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onClickCapture: handleClickCapture,
  };

  return { selectionRect, containerHandlers };
}
