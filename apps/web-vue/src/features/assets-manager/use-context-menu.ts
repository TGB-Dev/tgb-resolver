import { onMounted, onUnmounted, ref } from "vue";

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

const closedState = (): ContextMenuState => ({
  isOpen: false,
  target: null,
  targetFolderId: null,
  x: 0,
  y: 0,
});

export function useContextMenu() {
  const state = ref<ContextMenuState>(closedState());

  function open(
    e: {
      preventDefault: () => void;
      stopPropagation: () => void;
      clientX: number;
      clientY: number;
    },
    target: ContextMenuTarget | null,
    targetFolderId: string | null = null,
  ) {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 190;
    const menuHeight = 160;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8);

    state.value = {
      isOpen: true,
      target,
      targetFolderId,
      x: Math.max(8, x),
      y: Math.max(8, y),
    };
  }

  function close() {
    state.value = closedState();
  }

  function handleGlobalPointerDown(e: PointerEvent) {
    if ((e.target as HTMLElement).closest("[data-context-menu]")) return;
    if (state.value.isOpen) {
      close();
    }
  }

  onMounted(() => {
    document.addEventListener("pointerdown", handleGlobalPointerDown);
  });

  onUnmounted(() => {
    document.removeEventListener("pointerdown", handleGlobalPointerDown);
  });

  return { state, open, close };
}
