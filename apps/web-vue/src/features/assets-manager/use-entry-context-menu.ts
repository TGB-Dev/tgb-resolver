import { useAssetsManagerStore } from "./assets-manager-store";
import { type ContextMenuState, type ContextMenuTarget, useContextMenu } from "./use-context-menu";

export type { ContextMenuState, ContextMenuTarget };

export function useEntryContextMenu() {
  const contextMenu = useContextMenu();
  const assetsStore = useAssetsManagerStore();

  function openForEntry(
    e: {
      preventDefault: () => void;
      stopPropagation: () => void;
      clientX: number;
      clientY: number;
    },
    target: ContextMenuTarget,
  ) {
    if (!assetsStore.selectedIds.has(target.id)) {
      assetsStore.selectedIds = new Set([target.id]);
    }
    contextMenu.open(e, target);
  }

  function openForContainer(e: {
    preventDefault: () => void;
    stopPropagation: () => void;
    clientX: number;
    clientY: number;
  }) {
    const targetFolderId = assetsStore.selectedEntryId;
    assetsStore.clearSelection();
    contextMenu.open(e, null, targetFolderId);
  }

  return { ...contextMenu, openForEntry, openForContainer };
}
