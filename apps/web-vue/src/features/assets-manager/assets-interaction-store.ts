import { defineStore } from "pinia";
import { ref } from "vue";

import { useAssetsManagerStore } from "./assets-manager-store";
export const useAssetsInteractionStore = defineStore("assets-interaction", () => {
  const assets = useAssetsManagerStore();
  const clipboard = ref<{
    mode: "copy" | "cut";
    entryIds: string[];
    sourceFolderId: string | null;
  } | null>(null);
  const dragState = ref<{ entryIds: string[]; dropEffect: "copy" | "move" } | null>(null);
  const dropTargetId = ref<string | null>(null);
  function resolveIds(primaryId?: string) {
    if (primaryId && assets.selectedIds.has(primaryId)) return [...assets.selectedIds];
    return primaryId ? [primaryId] : [...assets.selectedIds];
  }
  function copySelection(primaryId?: string) {
    const entryIds = resolveIds(primaryId);
    if (entryIds.length)
      clipboard.value = { mode: "copy", entryIds, sourceFolderId: assets.selectedEntryId };
  }
  function cutSelection(primaryId?: string) {
    const entryIds = resolveIds(primaryId);
    if (entryIds.length)
      clipboard.value = { mode: "cut", entryIds, sourceFolderId: assets.selectedEntryId };
  }
  function clearClipboard() {
    clipboard.value = null;
  }
  function canPasteInto(targetFolderId: string | null) {
    return (
      clipboard.value !== null &&
      (targetFolderId === null || assets.findEntry(targetFolderId)?.isDirectory === true)
    );
  }
  function beginDrag(primaryId: string, dropEffect: "copy" | "move") {
    const entryIds = resolveIds(primaryId);
    dragState.value = { entryIds, dropEffect };
    return entryIds;
  }
  function setDropTarget(id: string | null) {
    dropTargetId.value = id;
  }
  function clearDrag() {
    dragState.value = null;
    dropTargetId.value = null;
  }
  return {
    clipboard,
    dragState,
    dropTargetId,
    copySelection,
    cutSelection,
    clearClipboard,
    canPasteInto,
    beginDrag,
    setDropTarget,
    clearDrag,
  };
});
