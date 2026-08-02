import { createModel, signal } from "@preact/signals-react";

import { assetsManagerModel } from "./assets-manager-model";
import type { FsEntry } from "./types";

type ClipboardMode = "copy" | "cut";
type DropEffectMode = "move" | "copy";

interface ClipboardState {
  mode: ClipboardMode;
  entryIds: string[];
  sourceFolderId: string | null;
}

interface DragState {
  entryIds: string[];
  dropEffect: DropEffectMode;
}

interface AssetsInteractionState {
  clipboard: ReturnType<typeof signal<ClipboardState | null>>;
  dragState: ReturnType<typeof signal<DragState | null>>;
  dropTargetId: ReturnType<typeof signal<string | null>>;
  hasClipboard: ReturnType<typeof signal<boolean>>;
  copySelection: (primaryId?: string) => void;
  cutSelection: (primaryId?: string) => void;
  clearClipboard: () => void;
  pasteInto: (targetFolderId: string | null) => Promise<void>;
  canPasteInto: (targetFolderId: string | null) => boolean;
  beginDrag: (primaryId: string, mode: DropEffectMode) => string[];
  setDragEffect: (mode: DropEffectMode) => void;
  setDropTarget: (folderId: string | null) => void;
  clearDrag: () => void;
  dropInto: (targetFolderId: string | null, mode: DropEffectMode) => Promise<void>;
  canTransferToFolder: (
    entryIds: string[],
    targetFolderId: string | null,
    copy?: boolean,
  ) => boolean;
  resolveActionEntryIds: (primaryId?: string) => string[];
  resolveDropUploadTarget: (entryId: string | null) => string | null;
  isInternalDragData: (dataTransfer: DataTransfer) => boolean;
}

const INTERNAL_DRAG_MIME = "application/x-tgb-asset-entry";

function normalizeFolderId(folderId: string | null): string | null {
  return folderId && folderId.length > 0 ? folderId : null;
}

function findFolderById(nodes: FsEntry[], id: string): FsEntry | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    const found = findFolderById(node.children ?? [], id);
    if (found) {
      return found;
    }
  }
  return null;
}

function findFolderParentId(
  nodes: FsEntry[],
  targetId: string,
  parentId: string | null = null,
): string | null | undefined {
  for (const node of nodes) {
    if (node.id === targetId) {
      return parentId;
    }
    const found = findFolderParentId(node.children ?? [], targetId, node.id);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}

function containsFolderId(node: FsEntry, targetId: string): boolean {
  if (node.id === targetId) {
    return true;
  }
  for (const child of node.children ?? []) {
    if (containsFolderId(child, targetId)) {
      return true;
    }
  }
  return false;
}

const AssetsInteractionModel = createModel<AssetsInteractionState>(() => {
  const clipboard = signal<ClipboardState | null>(null);
  const dragState = signal<DragState | null>(null);
  const dropTargetId = signal<string | null>(null);
  const hasClipboard = signal(false);

  function resolveActionEntryIds(primaryId?: string): string[] {
    const selected = assetsManagerModel.selectedIds.value;
    if (primaryId && selected.has(primaryId)) {
      return [...selected];
    }
    if (primaryId) {
      return [primaryId];
    }
    return [...selected];
  }

  function copySelection(primaryId?: string) {
    const entryIds = resolveActionEntryIds(primaryId);
    if (entryIds.length === 0) {
      return;
    }
    clipboard.value = {
      mode: "copy",
      entryIds,
      sourceFolderId: assetsManagerModel.selectedEntryId.value,
    };
    hasClipboard.value = true;
  }

  function cutSelection(primaryId?: string) {
    const entryIds = resolveActionEntryIds(primaryId);
    if (entryIds.length === 0) {
      return;
    }
    clipboard.value = {
      mode: "cut",
      entryIds,
      sourceFolderId: assetsManagerModel.selectedEntryId.value,
    };
    hasClipboard.value = true;
  }

  function clearClipboard() {
    clipboard.value = null;
    hasClipboard.value = false;
  }

  function canTransferToFolder(
    entryIds: string[],
    targetFolderId: string | null,
    copy = false,
  ): boolean {
    const normalizedTargetId = normalizeFolderId(targetFolderId);
    if (
      normalizedTargetId &&
      assetsManagerModel.findEntry(normalizedTargetId)?.isDirectory !== true
    ) {
      return false;
    }

    for (const id of entryIds) {
      const entry = assetsManagerModel.findEntry(id);
      if (!entry) {
        return false;
      }

      const sourceFolderId = entry.isDirectory
        ? findFolderParentId(assetsManagerModel.folderTree.value, entry.id)
        : normalizeFolderId(entry.parentId ?? null);
      if (!copy && sourceFolderId === normalizedTargetId) {
        return false;
      }

      if (entry.isDirectory) {
        if (normalizedTargetId === entry.id) {
          return false;
        }
        if (normalizedTargetId) {
          const sourceFolder = findFolderById(assetsManagerModel.folderTree.value, entry.id);
          if (sourceFolder && containsFolderId(sourceFolder, normalizedTargetId)) {
            return false;
          }
        }
      }
    }
    return true;
  }

  async function executeTransfer(
    entryIds: string[],
    targetFolderId: string | null,
    copy: boolean,
  ): Promise<boolean> {
    if (entryIds.length === 0 || !canTransferToFolder(entryIds, targetFolderId, copy)) {
      return false;
    }
    for (const id of entryIds) {
      const entry = assetsManagerModel.findEntry(id);
      if (!entry) {
        continue;
      }
      await assetsManagerModel.transferEntry(id, entry.isDirectory, targetFolderId, copy);
    }
    return true;
  }

  function canPasteInto(targetFolderId: string | null): boolean {
    const state = clipboard.value;
    return (
      state !== null && canTransferToFolder(state.entryIds, targetFolderId, state.mode === "copy")
    );
  }

  async function pasteInto(targetFolderId: string | null) {
    const state = clipboard.peek();
    if (!state) {
      return;
    }
    const didTransfer = await executeTransfer(
      state.entryIds,
      targetFolderId,
      state.mode === "copy",
    );
    if (state.mode === "cut" && didTransfer) {
      clearClipboard();
    }
  }

  function beginDrag(primaryId: string, mode: DropEffectMode): string[] {
    const entryIds = resolveActionEntryIds(primaryId);
    dragState.value = { entryIds, dropEffect: mode };
    return entryIds;
  }

  function setDragEffect(mode: DropEffectMode) {
    const state = dragState.peek();
    if (!state) {
      return;
    }
    dragState.value = { ...state, dropEffect: mode };
  }

  function setDropTarget(folderId: string | null) {
    dropTargetId.value = folderId;
  }

  function clearDrag() {
    dragState.value = null;
    dropTargetId.value = null;
  }

  async function dropInto(targetFolderId: string | null, mode: DropEffectMode) {
    const state = dragState.peek();
    if (!state) {
      return;
    }
    try {
      await executeTransfer(state.entryIds, targetFolderId, mode === "copy");
    } finally {
      clearDrag();
    }
  }

  function resolveDropUploadTarget(entryId: string | null): string | null {
    if (!entryId) {
      return assetsManagerModel.selectedEntryId.value;
    }

    const entry = assetsManagerModel.findEntry(entryId);
    if (!entry) {
      return assetsManagerModel.selectedEntryId.value;
    }
    return entry.isDirectory ? entry.id : assetsManagerModel.selectedEntryId.value;
  }

  function isInternalDragData(dataTransfer: DataTransfer): boolean {
    return dragState.peek() !== null || Array.from(dataTransfer.types).includes(INTERNAL_DRAG_MIME);
  }

  return {
    clipboard,
    dragState,
    dropTargetId,
    hasClipboard,
    copySelection,
    cutSelection,
    clearClipboard,
    pasteInto,
    canPasteInto,
    beginDrag,
    setDragEffect,
    setDropTarget,
    clearDrag,
    dropInto,
    canTransferToFolder,
    resolveActionEntryIds,
    resolveDropUploadTarget,
    isInternalDragData,
  };
});

export const assetsInteractionModel = new AssetsInteractionModel();
export { INTERNAL_DRAG_MIME };
