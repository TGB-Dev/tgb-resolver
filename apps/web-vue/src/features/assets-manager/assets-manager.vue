<script setup lang="ts">
import { SplitterPanel, SplitterResizeTrigger, SplitterRoot } from "@ark-ui/vue";
import { Box } from "@styled-system/jsx";
import { splitter } from "@styled-system/recipes";
import { useHotkey, useHotkeySequence } from "@tanstack/vue-hotkeys";
import { ref, watchEffect } from "vue";

import { useControlShowQuery } from "@/features/control/composables/use-show";
import { toaster } from "@/features/shared/ui/toaster";
import { useConfirmActionStore } from "@/stores/confirm-action-store";

import AssetsGridView from "./assets-grid-view.vue";
import { useAssetsInteractionStore } from "./assets-interaction-store";
import AssetsListView from "./assets-list-view.vue";
import { useAssetsManagerStore } from "./assets-manager-store";
import AssetsToolbar from "./assets-toolbar.vue";
import FolderTreeView from "./folder-tree-view.vue";
import UploadZone from "./upload-zone.vue";

defineOptions({ name: "AssetsManager" });

const store = useAssetsManagerStore();
const interactionStore = useAssetsInteractionStore();
const confirmStore = useConfirmActionStore();
const showQuery = useControlShowQuery();
const splitterClasses = splitter();
const fileInputRef = ref<HTMLInputElement | null>(null);

watchEffect(() => {
  if (showQuery.data.value) {
    store.applyShowState(showQuery.data.value);
  }
});

function handleError(e: unknown, label: string): void {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`${label} error:`, e);
  toaster.create({ title: label, description: msg, type: "error" });
}

useHotkey("Backspace", () => {
  const isTree = store.focusedPanel === "tree";
  const ids = isTree
    ? store.selectedEntryId
      ? new Set([store.selectedEntryId])
      : new Set<string>()
    : store.selectedIds;

  if (ids.size === 0) return;
  for (const id of ids) {
    const entry = store.findEntry(id);
    if (!entry) continue;
    confirmStore
      .confirmAction({
        title: entry.isDirectory ? "Delete Folder" : "Delete File",
        message: entry.isDirectory
          ? `Delete ${ids.size > 1 ? `${ids.size} folders` : "this folder"} and its contents?`
          : `Delete ${ids.size > 1 ? `${ids.size} files` : `"${entry.name}"`}?`,
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
      })
      .then((accepted) => {
        if (accepted) {
          store.deleteEntry(id, entry.isDirectory).catch((e) => handleError(e, "Delete"));
        }
      });
  }
});

useHotkey("F2", () => {
  const isTree = store.focusedPanel === "tree";
  const ids = isTree
    ? store.selectedEntryId
      ? new Set([store.selectedEntryId])
      : new Set<string>()
    : store.selectedIds;

  if (ids.size !== 1) return;
  const id = [...ids][0];
  if (!id) return;
  const entry = store.findEntry(id);
  if (!entry) return;
  confirmStore
    .promptAction({
      title: entry.isDirectory ? "Rename Folder" : "Rename File",
      label: "New name",
      defaultValue: entry.name,
      confirmLabel: "Rename",
    })
    .then((name) => {
      if (name?.trim()) {
        store.renameEntry(id, entry.isDirectory, name.trim()).catch((e) => handleError(e, "Rename"));
      }
    });
});

useHotkey("Mod+I", () => {
  fileInputRef.value?.click();
});

useHotkey("Mod+C", () => {
  interactionStore.copySelection();
});

useHotkey("Mod+X", () => {
  interactionStore.cutSelection();
});

useHotkey("Mod+V", () => {
  const targetFolderId = store.selectedEntryId;
  interactionStore.pasteInto(targetFolderId ?? null).catch((e) => {
    handleError(e, "Paste");
  });
});

useHotkeySequence(["Mod+K", "Mod+I"], () => {
  fileInputRef.value?.click();
});

useHotkeySequence(["Mod+K", "Mod+F"], () => {
  const folderId = store.selectedEntryId;
  confirmStore
    .promptAction({
      title: folderId ? "Create Subfolder" : "Create Folder",
      label: "Folder name",
      confirmLabel: "Create",
    })
    .then((name) => {
      if (name?.trim()) {
        store.createFolder(folderId ?? null, name.trim()).catch((e) => handleError(e, "Create Folder"));
      }
    });
});

function handleFileInputChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const files = target.files;
  const folderId = store.selectedEntryId;
  if (files) {
    for (const file of files) {
      store.uploadAsset(folderId, file).catch(console.error);
    }
  }
  target.value = "";
}
</script>

<template>
  <Box w="full" h="full" overflow="hidden">
    <SplitterRoot
      :class="splitterClasses.root"
      orientation="horizontal"
      :defaultSize="[25, 75]"
      :panels="[{ id: 'tree', minSize: 15 }, { id: 'content', minSize: 40 }]"
    >
      <SplitterPanel id="tree" :minSize="15" :class="splitterClasses.panel">
        <FolderTreeView />
      </SplitterPanel>

      <SplitterResizeTrigger id="tree:content" :class="splitterClasses.resizeTrigger" />

      <SplitterPanel id="content" :minSize="40" :class="splitterClasses.panel">
        <Box display="flex" flexDirection="column" overflow="hidden" h="full">
          <AssetsToolbar />
          <Box flex="1" overflow="hidden">
            <UploadZone>
              <Box h="full">
                <AssetsListView v-if="store.viewMode === 'list'" />
                <AssetsGridView v-else />
              </Box>
            </UploadZone>
          </Box>
        </Box>
      </SplitterPanel>
    </SplitterRoot>

    <input
      ref="fileInputRef"
      type="file"
      multiple
      hidden
      @change="handleFileInputChange"
    />
  </Box>
</template>
