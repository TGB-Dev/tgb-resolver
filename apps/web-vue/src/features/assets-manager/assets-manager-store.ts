import { defineStore } from "pinia";
import { computed, ref } from "vue";

import type { FsEntry, ViewMode } from "./types";

export const useAssetsManagerStore = defineStore("assets-manager", () => {
  const folderTree = ref<FsEntry[]>([]);
  const allFiles = ref<FsEntry[]>([]);
  const selectedEntryId = ref<string | null>(null);
  const selectedIds = ref(new Set<string>());
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
  }
  function clearSelection() {
    selectedIds.value = new Set();
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
    expandedFolderIds.value = new Set(folderTree.value.map((folder) => folder.id));
  }
  function collapseAll() {
    expandedFolderIds.value = new Set();
  }
  return {
    folderTree,
    allFiles,
    selectedEntryId,
    selectedIds,
    viewMode,
    expandedFolderIds,
    focusedPanel,
    entries,
    findEntry,
    selectEntry,
    clearSelection,
    setViewMode,
    toggleFolder,
    expandAll,
    collapseAll,
  };
});
