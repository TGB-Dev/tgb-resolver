import { useEffect, useRef, useState } from "react";

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ContainerHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onClickCapture: (e: React.MouseEvent) => void;
}

interface HitEntry {
  id: string;
  el: HTMLElement;
}

export function useRubberBandSelect(
  containerRef: React.RefObject<HTMLElement | null>,
  onSelect: (entryIds: string[], mod: boolean) => void,
) {
  const [selectionRect, setSelectionRect] = useState<Rect | null>(null);
  const isDragging = useRef(false);
  const dragEndTime = useRef(0);
  const startPoint = useRef({ x: 0, y: 0 });
  const currentPoint = useRef({ x: 0, y: 0 });
  const modKey = useRef(false);

  function getEntryElements(): HitEntry[] {
    const container = containerRef.current;
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

  function handlePointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-entry-id]")) return;
    if (target.closest("[data-context-menu-backdrop]")) return;

    isDragging.current = true;
    modKey.current = e.metaKey || e.ctrlKey;
    startPoint.current = { x: e.clientX, y: e.clientY };
    currentPoint.current = { x: e.clientX, y: e.clientY };
    setSelectionRect(null);

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore if pointer capture unsupported
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging.current) return;
    currentPoint.current = { x: e.clientX, y: e.clientY };
    const rect = computeRect(startPoint.current, currentPoint.current);
    setSelectionRect(rect);

    if (rect) {
      const entries = getEntryElements();
      const selected = entries.filter((entry) => hitTest(rect, entry.el)).map((entry) => entry.id);
      onSelect(selected, modKey.current);
    } else {
      onSelect([], modKey.current);
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!isDragging.current) return;
    isDragging.current = false;
    dragEndTime.current = Date.now();

    try {
      if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }

    const rect = computeRect(startPoint.current, currentPoint.current);
    setSelectionRect(null);

    if (rect) {
      const entries = getEntryElements();
      const selected = entries.filter((entry) => hitTest(rect, entry.el)).map((entry) => entry.id);
      onSelect(selected, modKey.current);
    }
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isDragging.current) {
        isDragging.current = false;
        setSelectionRect(null);
      }
    }

    container.addEventListener("keydown", onKeyDown);
    return () => container.removeEventListener("keydown", onKeyDown);
  }, [containerRef]);

  function handleClickCapture(e: React.MouseEvent) {
    if (Date.now() - dragEndTime.current < 100) {
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
