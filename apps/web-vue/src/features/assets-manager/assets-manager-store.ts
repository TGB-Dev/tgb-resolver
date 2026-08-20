import type { ShowStateSnapshot } from "@tgb-resolver/contracts";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

import type { FsEntry, ViewMode } from "./types";

export const useAssetsManagerStore = defineStore("assets-manager", () => {
  const folderTree = ref<FsEntry[]>([]);
  const allFiles = ref<FsEntry[]>([]);
  const selectedEntryId = ref<string | null>(null);
  const selectedIds = ref(new Set<string>());
  const lastClickedIndex = ref<number | null>(null);
  const viewMode = ref<ViewMode>("grid");
  const expandedFolderIds = ref(new Set<string>());
  const focusedPanel = ref<"tree" | "content">("content");
  const entries = computed(() => {
    const folders = selectedEntryId.value
      ? (findEntry(selectedEntryId.value)?.children ?? [])
      : folderTree.value;
    const files = allFiles.value.filter(
      (file) => file.parentId === (selectedEntryId.value ?? undefined),
    );
    return [...folders, ...files];
  });
  function findEntry(id: string): FsEntry | undefined {
    const search = (nodes: FsEntry[]): FsEntry | undefined => {
      for (const node of nodes) {
        if (node.id === id) return node;
        const found = search(node.children ?? []);
        if (found) return found;
      }
      return undefined;
    };
    return allFiles.value.find((file) => file.id === id) ?? search(folderTree.value);
  }
  function selectEntry(id: string | null) {
    selectedEntryId.value = id;
    selectedIds.value = new Set();
    lastClickedIndex.value = null;
  }
  function clearSelection() {
    selectedIds.value = new Set();
    lastClickedIndex.value = null;
  }
  function handleEntryClick(
    event: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean },
    index: number,
  ) {
    const entry = entries.value[index];
    if (!entry) return;
    const next = new Set(selectedIds.value);
    if (event.metaKey || event.ctrlKey) {
      if (next.has(entry.id)) next.delete(entry.id);
      else next.add(entry.id);
    } else if (event.shiftKey && lastClickedIndex.value !== null) {
      const start = Math.min(lastClickedIndex.value, index);
      const end = Math.max(lastClickedIndex.value, index);
      for (let i = start; i <= end; i++) {
        const rangeEntry = entries.value[i];
        if (rangeEntry) next.add(rangeEntry.id);
      }
    } else next.clear(), next.add(entry.id);
    selectedIds.value = next;
    lastClickedIndex.value = index;
  }
  function setViewMode(mode: ViewMode) {
    viewMode.value = mode;
  }
  function toggleFolder(id: string) {
    const next = new Set(expandedFolderIds.value);
    next.has(id) ? next.delete(id) : next.add(id);
    expandedFolderIds.value = next;
  }
  function expandAll() {
    const ids: string[] = [];
    function collect(nodes: FsEntry[]) {
      for (const node of nodes) {
        ids.push(node.id);
        collect(node.children ?? []);
      }
    }
    collect(folderTree.value);
    expandedFolderIds.value = new Set(ids);
  }
  function collapseAll() {
    expandedFolderIds.value = new Set();
  }
  function applyShowState(data: ShowStateSnapshot) {
    const folders = (data.assets?.folders ?? []) as Array<{
      id: string;
      name: string;
      children: Array<{ id: string; name: string; children: unknown[] }>;
    }>;
    const build = (nodes: typeof folders): FsEntry[] =>
      nodes.map((node) => ({
        id: node.id,
        name: node.name,
        isDirectory: true,
        children: build(node.children as typeof folders),
      }));
    folderTree.value = build(folders);
    allFiles.value = (data.assets?.items ?? []).map((item) => ({
      id: item.id ?? "",
      name: item.fileName ?? "",
      isDirectory: false,
      contentType: item.contentType ?? "",
      sizeBytes: item.sizeBytes ?? 0,
      parentId: (item as { folderId?: string }).folderId ?? undefined,
    }));
    if (folders.length) expandAll();
  }
  return {
    folderTree,
    allFiles,
    selectedEntryId,
    selectedIds,
    lastClickedIndex,
    viewMode,
    expandedFolderIds,
    focusedPanel,
    entries,
    findEntry,
    selectEntry,
    clearSelection,
    handleEntryClick,
    setViewMode,
    toggleFolder,
    expandAll,
    collapseAll,
    applyShowState,
  };
});
