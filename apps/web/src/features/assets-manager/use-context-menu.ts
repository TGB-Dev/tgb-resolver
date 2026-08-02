import { useCallback, useEffect, useState } from "react";

export interface ContextMenuTarget {
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

export function useContextMenu() {
  const [state, setState] = useState<ContextMenuState>({
    isOpen: false,
    target: null,
    targetFolderId: null,
    x: 0,
    y: 0,
  });

  function open(
    e: React.MouseEvent,
    target: ContextMenuTarget | null,
    targetFolderId: string | null = null,
  ) {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 190;
    const menuHeight = 160;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8);

    setState({ isOpen: true, target, targetFolderId, x: Math.max(8, x), y: Math.max(8, y) });
  }

  const close = useCallback(() => {
    setState({ isOpen: false, target: null, targetFolderId: null, x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!state.isOpen) return;

    function handleGlobalPointerDown(e: PointerEvent) {
      // If clicking inside a context menu, don't close it here (menu items handle their own close)
      const target = e.target as HTMLElement;
      if (target.closest("[data-context-menu]")) return;
      close();
    }
    document.addEventListener("pointerdown", handleGlobalPointerDown);

    return () => {
      document.removeEventListener("pointerdown", handleGlobalPointerDown);
    };
  }, [state.isOpen, close]);

  return { state, open, close };
}
