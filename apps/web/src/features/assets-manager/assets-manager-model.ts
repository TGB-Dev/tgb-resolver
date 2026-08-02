import {
  computed,
  createModel,
  type ReadonlySignal,
  type Signal,
  signal,
} from "@preact/signals-react";
import type { ShowStateSnapshot } from "@tgb-resolver/contracts";
import {
  createFolderEndpoint,
  deleteEntryEndpoint,
  renameEntryEndpoint,
  transferEntryEndpoint,
  uploadAssetEndpoint,
} from "@tgb-resolver/contracts";

import type { FsEntry, ViewMode } from "./types";

interface AssetsManagerState {
  folderTree: Signal<FsEntry[]>;
  selectedEntryId: Signal<string | null>;
  selectedIds: Signal<Set<string>>;
  lastClickedIndex: Signal<number | null>;
  viewMode: Signal<ViewMode>;
  expandedFolderIds: Signal<Set<string>>;
  entries: ReadonlySignal<FsEntry[]>;
  allFiles: ReadonlySignal<FsEntry[]>;
  selectEntry: (id: string | null) => void;
  clearSelection: () => void;
  handleEntryClick: (
    e: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean },
    index: number,
  ) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleFolder: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  createFolder: (parentId: string | null, name: string) => Promise<void>;
  uploadAsset: (folderId: string | null, file: File) => Promise<void>;
  renameEntry: (id: string, isDirectory: boolean, newName: string) => Promise<void>;
  deleteEntry: (id: string, isDirectory: boolean) => Promise<void>;
  transferEntry: (
    id: string,
    isDirectory: boolean,
    targetFolderId: string | null,
    copy: boolean,
  ) => Promise<void>;
  findEntry: (id: string) => FsEntry | undefined;
  findEntryName: (id: string) => string | undefined;
  applyShowState: (data: ShowStateSnapshot) => void;
  setInvalidateCache: (fn: () => void) => void;
  focusedPanel: Signal<"tree" | "content">;
  ensureFolderPath: (rootFolderId: string | null, pathParts: string[]) => Promise<string | null>;
}

let invalidateCache: (() => void) | null = null;

const AssetsManagerModel = createModel<AssetsManagerState>(() => {
  const folderTree = signal<FsEntry[]>([]);
  const allFiles = signal<FsEntry[]>([]);
  const selectedEntryId = signal<string | null>(null);
  const selectedIds = signal<Set<string>>(new Set());
  const lastClickedIndex = signal<number | null>(null);
  const viewMode = signal<ViewMode>("grid");
  const expandedFolderIds = signal<Set<string>>(new Set());
  const showVersion = signal<number>(0);
  const focusedPanel = signal<"tree" | "content">("content");

  const entries = computed<FsEntry[]>(() => {
    const selectedId = selectedEntryId.value;
    const childFolders = selectedId
      ? collectChildFolders(folderTree.value, selectedId)
      : folderTree.value;
    const dirFiles = allFiles.value.filter((f) =>
      selectedId ? f.parentId === selectedId : !f.parentId,
    );
    return [...childFolders, ...dirFiles];
  });

  function collectChildFolders(tree: FsEntry[], id: string): FsEntry[] {
    for (const node of tree) {
      if (node.id === id) return node.children ?? [];
      const found = collectChildFolders(node.children ?? [], id);
      if (found.length > 0) return found;
    }
    return [];
  }

  function collectAllFolderIds(folders: FsEntry[]): string[] {
    const ids: string[] = [];
    for (const folder of folders) {
      ids.push(folder.id);
      if (folder.children && folder.children.length > 0) {
        ids.push(...collectAllFolderIds(folder.children));
      }
    }
    return ids;
  }

  function selectEntry(id: string | null): void {
    selectedEntryId.value = id;
    selectedIds.value = new Set();
    lastClickedIndex.value = null;
  }

  function clearSelection(): void {
    selectedIds.value = new Set();
    lastClickedIndex.value = null;
  }

  function handleEntryClick(
    e: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean },
    index: number,
  ): void {
    const current = entries.peek();
    const entry = current[index];
    if (!entry) return;

    const mod = e.metaKey || e.ctrlKey;
    const shift = e.shiftKey;

    if (mod) {
      const next = new Set(selectedIds.value);
      if (next.has(entry.id)) next.delete(entry.id);
      else next.add(entry.id);
      selectedIds.value = next;
    } else if (shift && lastClickedIndex.value !== null) {
      const lastIdx = lastClickedIndex.value;
      const start = Math.min(lastIdx, index);
      const end = Math.max(lastIdx, index);
      const next = new Set(selectedIds.value);
      for (let i = start; i <= end; i++) {
        const rangeEntry = current[i];
        if (rangeEntry) next.add(rangeEntry.id);
      }
      selectedIds.value = next;
    } else {
      selectedIds.value = new Set([entry.id]);
    }
    lastClickedIndex.value = index;
  }

  function setViewMode(mode: ViewMode): void {
    viewMode.value = mode;
  }

  function toggleFolder(id: string): void {
    const next = new Set(expandedFolderIds.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expandedFolderIds.value = next;
  }

  function expandAll(): void {
    expandedFolderIds.value = new Set(collectAllFolderIds(folderTree.value));
  }

  function collapseAll(): void {
    expandedFolderIds.value = new Set();
  }

  function buildFolderTree(
    nodes: {
      id: string;
      name: string;
      children: { id: string; name: string; children: unknown[] }[];
    }[],
  ): FsEntry[] {
    return nodes.map((n) => ({
      id: n.id,
      name: n.name,
      isDirectory: true,
      children: n.children.length > 0 ? buildFolderTree(n.children as typeof nodes) : [],
    }));
  }

  function applyShowState(data: ShowStateSnapshot): void {
    const assets = data.assets;
    const rawFolders = (assets?.folders ?? []) as {
      id: string;
      name: string;
      children: { id: string; name: string; children: unknown[] }[];
    }[];
    const rawItems = assets?.items ?? [];

    showVersion.value = data.showVersion ?? 0;
    folderTree.value = buildFolderTree(rawFolders);
    allFiles.value = rawItems.map((item) => ({
      id: item.id ?? "",
      name: item.fileName ?? "",
      isDirectory: false,
      contentType: item.contentType ?? "",
      sizeBytes: item.sizeBytes ?? 0,
      parentId: (item as { folderId?: string }).folderId ?? undefined,
    }));

    // Retain selection if they still exist. If they don't, they'll just show empty or we can prune them later.
    // We won't clear them here anymore.

    if (rawFolders.length > 0) {
      expandedFolderIds.value = new Set(collectAllFolderIds(folderTree.value));
    }
  }

  function setInvalidateCache(fn: () => void): void {
    invalidateCache = fn;
  }

  function findEntry(id: string): FsEntry | undefined {
    for (const file of allFiles.value) {
      if (file.id === id) return file;
    }
    function search(nodes: FsEntry[]): FsEntry | undefined {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
          const found = search(node.children);
          if (found) return found;
        }
      }
      return undefined;
    }
    return search(folderTree.value);
  }

  function findEntryName(id: string): string | undefined {
    return findEntry(id)?.name;
  }

  function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 8192;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCodePoint(...chunk);
    }
    return btoa(binary);
  }

  async function createFolder(parentId: string | null, name: string): Promise<void> {
    try {
      const res = await createFolderEndpoint({
        body: {
          showVersion: showVersion.value,
          parentFolderId: parentId ?? "",
          name,
        },
        throwOnError: true,
      });
      applyShowState(res.data as ShowStateSnapshot);
      invalidateCache?.();
    } catch (e) {
      console.error("createFolder error:", e);
      invalidateCache?.();
      throw e;
    }
  }

  async function ensureFolder(parentId: string | null, name: string): Promise<string> {
    let children = parentId ? collectChildFolders(folderTree.value, parentId) : folderTree.value;

    let existing = children.find((c) => c.name === name);
    if (existing) return existing.id;

    await createFolder(parentId, name);

    children = parentId ? collectChildFolders(folderTree.value, parentId) : folderTree.value;
    existing = children.find((c) => c.name === name);
    if (!existing) throw new Error("Folder creation failed or not found in state");
    return existing.id;
  }

  async function ensureFolderPath(
    rootFolderId: string | null,
    pathParts: string[],
  ): Promise<string | null> {
    let currentId = rootFolderId;
    for (const part of pathParts) {
      currentId = await ensureFolder(currentId, part);
    }
    return currentId;
  }

  async function uploadAsset(folderId: string | null, file: File): Promise<void> {
    try {
      const buffer = await file.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);
      const res = await uploadAssetEndpoint({
        path: { id: `asset-${Date.now()}` },
        body: {
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          bytes: base64,
          showVersion: showVersion.value,
          ...(folderId ? { folderId } : {}),
        },
        throwOnError: true,
      });
      applyShowState(res.data as ShowStateSnapshot);
      invalidateCache?.();
    } catch (e) {
      console.error("uploadAsset error:", e);
      invalidateCache?.();
      throw e;
    }
  }

  async function renameEntry(id: string, isDirectory: boolean, newName: string): Promise<void> {
    try {
      const res = await renameEntryEndpoint({
        path: { id },
        body: { showVersion: showVersion.value, isDirectory, newName },
        throwOnError: true,
      });
      applyShowState(res.data as ShowStateSnapshot);
      invalidateCache?.();
    } catch (e) {
      console.error("renameEntry error:", e);
      invalidateCache?.();
      throw e;
    }
  }

  async function deleteEntry(id: string, isDirectory: boolean): Promise<void> {
    try {
      const res = await deleteEntryEndpoint({
        path: { id },
        body: { showVersion: showVersion.value, isDirectory },
        throwOnError: true,
      });
      applyShowState(res.data as ShowStateSnapshot);
      if (!isDirectory) {
        const next = new Set(selectedIds.value);
        next.delete(id);
        selectedIds.value = next;
      }

      if (isDirectory && selectedEntryId.value === id) {
        selectedEntryId.value = null;
      }
      invalidateCache?.();
    } catch (e) {
      console.error("deleteEntry error:", e);
      invalidateCache?.();
      throw e;
    }
  }

  async function transferEntry(
    id: string,
    isDirectory: boolean,
    targetFolderId: string | null,
    copy: boolean,
  ): Promise<void> {
    try {
      const res = await transferEntryEndpoint({
        path: { id },
        body: {
          showVersion: showVersion.value,
          isDirectory,
          targetFolderId: targetFolderId ?? "",
          copy,
        },
        throwOnError: true,
      });
      applyShowState(res.data as ShowStateSnapshot);
      invalidateCache?.();
    } catch (e) {
      console.error("transferEntry error:", e);
      invalidateCache?.();
      throw e;
    }
  }

  return {
    folderTree,
    selectedEntryId,
    selectedIds,
    lastClickedIndex,
    viewMode,
    expandedFolderIds,
    entries,
    allFiles,
    selectEntry,
    clearSelection,
    handleEntryClick,
    setViewMode,
    toggleFolder,
    expandAll,
    collapseAll,
    createFolder,
    uploadAsset,
    renameEntry,
    deleteEntry,
    transferEntry,
    findEntry,
    findEntryName,
    applyShowState,
    setInvalidateCache,
    focusedPanel,
    ensureFolderPath,
  };
});

export const assetsManagerModel = new AssetsManagerModel();
