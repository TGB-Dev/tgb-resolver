import { defineStore } from "pinia";
import { ref } from "vue";

import { useAssetsManagerStore } from "./assets-manager-store";
import { ClipboardMode, DropEffect } from "./types";

export const INTERNAL_DRAG_MIME = "application/x-tgb-assets-drag";

export const useAssetsInteractionStore = defineStore("assets-interaction", () => {
  const assets = useAssetsManagerStore();
  const clipboard = ref<{
    mode: ClipboardMode;
    entryIds: string[];
    sourceFolderId: string | null;
  } | null>(null);
  const dragState = ref<{ entryIds: string[]; dropEffect: DropEffect } | null>(null);
  const dropTargetId = ref<string | null>(null);

  function isInternalDragData(dataTransfer: DataTransfer | null): boolean {
    if (!dataTransfer) return false;
    return dataTransfer.types.includes(INTERNAL_DRAG_MIME);
  }

  function setDragEffect(effect: DropEffect) {
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
      clipboard.value = {
        mode: ClipboardMode.Copy,
        entryIds,
        sourceFolderId: assets.selectedEntryId,
      };
  }

  function cutSelection(primaryId?: string) {
    const entryIds = resolveIds(primaryId);
    if (entryIds.length)
      clipboard.value = {
        mode: ClipboardMode.Cut,
        entryIds,
        sourceFolderId: assets.selectedEntryId,
      };
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
    if (
      !state ||
      !canTransferToFolder(state.entryIds, targetFolderId, state.mode === ClipboardMode.Copy)
    )
      return false;
    for (const id of state.entryIds) {
      const entry = assets.findEntry(id);
      if (entry)
        await assets.transferEntry(
          id,
          entry.isDirectory,
          targetFolderId,
          state.mode === ClipboardMode.Copy,
        );
    }
    if (state.mode === ClipboardMode.Cut) clearClipboard();
    return true;
  }

  async function dropInto(targetFolderId: string | null, dropEffect: DropEffect) {
    const state = dragState.value;
    if (
      !state ||
      !canTransferToFolder(state.entryIds, targetFolderId, dropEffect === DropEffect.Copy)
    )
      return false;
    for (const id of state.entryIds) {
      const entry = assets.findEntry(id);
      if (entry)
        await assets.transferEntry(
          id,
          entry.isDirectory,
          targetFolderId,
          dropEffect === DropEffect.Copy,
        );
    }
    clearDrag();
    return true;
  }

  function beginDrag(primaryId: string, dropEffect: DropEffect) {
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
