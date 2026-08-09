import { createModel, signal, useSignalEffect } from "@preact/signals-react";
import { useRef } from "react";

interface ContextMenuTarget {
  id: string;
  name: string;
  isDirectory: boolean;
}

export interface ContextMenuState {
  isOpen: boolean;
  target: ContextMenuTarget | null;
  targetFolderId: string | null;
  x: number;
  y: number;
}

const closedState = (): ContextMenuState => ({
  isOpen: false,
  target: null,
  targetFolderId: null,
  x: 0,
  y: 0,
});

type ContextMenuModelState = ReturnType<typeof createContextMenuModel>;

function createContextMenuModel() {
  const state = signal<ContextMenuState>(closedState());

  function open(
    e: Pick<React.MouseEvent, "preventDefault" | "stopPropagation" | "clientX" | "clientY">,
    target: ContextMenuTarget | null,
    targetFolderId: string | null = null,
  ) {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 190;
    const menuHeight = 160;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8);

    state.value = { isOpen: true, target, targetFolderId, x: Math.max(8, x), y: Math.max(8, y) };
  }

  function close() {
    state.value = closedState();
  }

  return { state, open, close };
}

const ContextMenuModel = createModel<ContextMenuModelState>(() => createContextMenuModel());

export function useContextMenu() {
  const modelRef = useRef<InstanceType<typeof ContextMenuModel>>(null);
  if (!modelRef.current) modelRef.current = new ContextMenuModel();
  const model = modelRef.current;

  useSignalEffect(() => {
    if (!model.state.value.isOpen) return;

    function handleGlobalPointerDown(e: PointerEvent) {
      if ((e.target as HTMLElement).closest("[data-context-menu]")) return;
      model.close();
    }

    document.addEventListener("pointerdown", handleGlobalPointerDown);
    return () => document.removeEventListener("pointerdown", handleGlobalPointerDown);
  });

  return { ...model, state: model.state.value };
}
