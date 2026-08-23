import { defineStore } from "pinia";
import { ref } from "vue";

import { useAssetsManagerStore } from "./assets-manager-store";

export const INTERNAL_DRAG_MIME = "application/x-tgb-assets-drag";

export const useAssetsInteractionStore = defineStore("assets-interaction", () => {
  const assets = useAssetsManagerStore();
  const clipboard = ref<{
    mode: "copy" | "cut";
    entryIds: string[];
    sourceFolderId: string | null;
  } | null>(null);
  const dragState = ref<{ entryIds: string[]; dropEffect: "copy" | "move" } | null>(null);
  const dropTargetId = ref<string | null>(null);

  function isInternalDragData(dataTransfer: DataTransfer | null): boolean {
    if (!dataTransfer) return false;
    return dataTransfer.types.includes(INTERNAL_DRAG_MIME);
  }

  function setDragEffect(effect: "copy" | "move") {
    if (dragState.value) {
      dragState.value.dropEffect = effect;
    }
  }

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

  function canTransferToFolder(entryIds: string[], targetFolderId: string | null, copy: boolean) {
    if (targetFolderId !== null && assets.findEntry(targetFolderId)?.isDirectory !== true)
      return false;
    if (copy) return entryIds.length > 0;
    return !entryIds.includes(targetFolderId ?? "");
  }

  async function pasteInto(targetFolderId: string | null) {
    const state = clipboard.value;
    if (!state || !canTransferToFolder(state.entryIds, targetFolderId, state.mode === "copy"))
      return false;
    for (const id of state.entryIds) {
      const entry = assets.findEntry(id);
      if (entry)
        await assets.transferEntry(id, entry.isDirectory, targetFolderId, state.mode === "copy");
    }
    if (state.mode === "cut") clearClipboard();
    return true;
  }

  async function dropInto(targetFolderId: string | null, dropEffect: "copy" | "move") {
    const state = dragState.value;
    if (!state || !canTransferToFolder(state.entryIds, targetFolderId, dropEffect === "copy"))
      return false;
    for (const id of state.entryIds) {
      const entry = assets.findEntry(id);
      if (entry)
        await assets.transferEntry(id, entry.isDirectory, targetFolderId, dropEffect === "copy");
    }
    clearDrag();
    return true;
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

  function resolveDropUploadTarget(entryId: string | null): string | null {
    if (!entryId) return assets.selectedEntryId ?? null;
    const entry = assets.findEntry(entryId);
    if (!entry) return assets.selectedEntryId ?? null;
    return entry.isDirectory ? entry.id : (assets.selectedEntryId ?? null);
  }

  return {
    clipboard,
    dragState,
    dropTargetId,
    isInternalDragData,
    setDragEffect,
    copySelection,
    cutSelection,
    clearClipboard,
    canPasteInto,
    canTransferToFolder,
    pasteInto,
    dropInto,
    beginDrag,
    setDropTarget,
    clearDrag,
    resolveDropUploadTarget,
  };
});
