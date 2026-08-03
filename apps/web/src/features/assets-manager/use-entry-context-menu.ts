import { assetsManagerModel } from "./assets-manager-model";
import { useContextMenu } from "./use-context-menu";

interface EntryContextTarget {
  id: string;
  name: string;
  isDirectory: boolean;
}

export function useEntryContextMenu() {
  const contextMenu = useContextMenu();

  function openForEntry(e: React.MouseEvent, target: EntryContextTarget) {
    if (!assetsManagerModel.selectedIds.value.has(target.id)) {
      assetsManagerModel.selectedIds.value = new Set([target.id]);
    }
    contextMenu.open(e, target);
  }

  function openForContainer(e: React.MouseEvent) {
    const targetFolderId = assetsManagerModel.selectedEntryId.value;
    assetsManagerModel.clearSelection();
    contextMenu.open(e, null, targetFolderId);
  }

  return { ...contextMenu, openForEntry, openForContainer };
}
