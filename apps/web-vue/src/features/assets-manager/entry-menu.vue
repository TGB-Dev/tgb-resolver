<script setup lang="ts">
import { Menu } from "@ark-ui/vue";
import { Clipboard, Copy, Download, ExternalLink, Folder, FolderPlus, Pencil, Scissors, Trash2, Upload } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { menu } from "@styled-system/recipes";

import { toaster } from "@/features/shared/ui/toaster";
import { useConfirmActionStore } from "@/stores/confirm-action-store";

import { useAssetsInteractionStore } from "./assets-interaction-store";
import { useAssetsManagerStore } from "./assets-manager-store";
import { processUploadBatch } from "./upload-helpers";
import type { ContextMenuTarget } from "./use-context-menu";

const { target, targetFolderId } = defineProps<{
  target: ContextMenuTarget | null;
  targetFolderId: string | null;
}>();

const store = useAssetsManagerStore();
const interactionStore = useAssetsInteractionStore();
const confirmStore = useConfirmActionStore();
const menuClasses = menu();

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

const dangerClass = css({
  color: "fg.error",
  _hover: { bg: "bg.error", color: "fg.error" },
});

function handleOperationError(error: unknown, label: string): void {
  const description = error instanceof Error ? error.message : String(error);
  toaster.create({ title: label, description, type: "error" });
}

async function promptFiles(): Promise<FileList | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = () => resolve(input.files);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

async function promptDirectory(): Promise<FileList | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.webkitdirectory = true;
    input.onchange = () => resolve(input.files);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

async function handleUploadFiles(folderId: string | null) {
  const files = await promptFiles();
  if (files) {
    const items = Array.from(files).map((f) => ({ isFile: true, file: f, pathParts: [] }));
    processUploadBatch(folderId, items, () => {});
  }
}

async function handleUploadFolder(folderId: string | null) {
  const files = await promptDirectory();
  if (files) {
    const items = Array.from(files).map((f) => {
      const pathParts = f.webkitRelativePath.split("/").slice(0, -1);
      return { isFile: true, file: f, pathParts };
    });
    processUploadBatch(folderId, items, () => {});
  }
}

async function handleCreateFolder(folderId: string | null) {
  const name = await confirmStore.promptAction({
    title: "Create Folder",
    label: "Folder name",
    confirmLabel: "Create",
  });
  if (name?.trim()) {
    try {
      await store.createFolder(folderId, name.trim());
    } catch (err) {
      handleOperationError(err, "Create Folder");
    }
  }
}

async function handlePaste(folderId: string | null) {
  try {
    await interactionStore.pasteInto(folderId);
  } catch (err) {
    handleOperationError(err, "Paste");
  }
}

function handleOpenFile(target: ContextMenuTarget) {
  window.open(`${API_URL}/assets/${target.id}`, "_blank");
}

function handleDownloadFile(target: ContextMenuTarget) {
  const a = document.createElement("a");
  a.href = `${API_URL}/assets/${target.id}`;
  a.download = target.name;
  a.click();
}

async function handleRenameFile(target: ContextMenuTarget) {
  const name = await confirmStore.promptAction({
    title: "Rename File",
    label: "New name",
    defaultValue: target.name,
    confirmLabel: "Rename",
  });
  if (name?.trim()) {
    store.renameEntry(target.id, false, name.trim());
  }
}

async function handleDeleteFile(target: ContextMenuTarget) {
  const accepted = await confirmStore.confirmAction({
    title: "Delete File",
    message: `Delete "${target.name}"?`,
    confirmLabel: "Delete",
    cancelLabel: "Cancel",
  });
  if (accepted) {
    store.deleteEntry(target.id, false);
  }
}

async function handleRenameFolder(target: ContextMenuTarget) {
  const name = await confirmStore.promptAction({
    title: "Rename Folder",
    label: "New name",
    defaultValue: target.name,
    confirmLabel: "Rename",
  });
  if (name?.trim()) {
    store.renameEntry(target.id, true, name.trim());
  }
}

async function handleDeleteFolder(target: ContextMenuTarget) {
  const accepted = await confirmStore.confirmAction({
    title: "Delete Folder",
    message: "Delete this folder and its contents?",
    confirmLabel: "Delete",
    cancelLabel: "Cancel",
  });
  if (accepted) {
    store.deleteEntry(target.id, true);
  }
}
</script>

<template>
  <!-- Folder item menu -->
  <template v-if="target?.isDirectory">
    <Menu.ItemGroup>
      <Menu.ItemGroupLabel :class="menuClasses.itemGroupLabel">
        {{ target.name }}
      </Menu.ItemGroupLabel>
      <Menu.Separator :class="menuClasses.separator" />
      <Menu.Item :class="menuClasses.item" value="upload-files" @select="handleUploadFiles(target.id)">
        <Upload :size="16" aria-hidden />
        <Menu.ItemText :class="menuClasses.itemText">Upload Files</Menu.ItemText>
      </Menu.Item>
      <Menu.Item :class="menuClasses.item" value="upload-folder" @select="handleUploadFolder(target.id)">
        <FolderPlus :size="16" aria-hidden />
        <Menu.ItemText :class="menuClasses.itemText">Upload Folder</Menu.ItemText>
      </Menu.Item>
      <Menu.Item :class="menuClasses.item" value="create-folder" @select="handleCreateFolder(target.id)">
        <Folder :size="16" aria-hidden />
        <Menu.ItemText :class="menuClasses.itemText">Create Folder</Menu.ItemText>
      </Menu.Item>
      <Menu.Separator :class="menuClasses.separator" />
      <Menu.Item :class="menuClasses.item" value="copy" @select="interactionStore.copySelection(target.id)">
        <Copy :size="16" aria-hidden />
        <Menu.ItemText :class="menuClasses.itemText">Copy</Menu.ItemText>
      </Menu.Item>
      <Menu.Item :class="menuClasses.item" value="cut" @select="interactionStore.cutSelection(target.id)">
        <Scissors :size="16" aria-hidden />
        <Menu.ItemText :class="menuClasses.itemText">Cut</Menu.ItemText>
      </Menu.Item>
      <Menu.Item
        :class="menuClasses.item"
        value="paste"
        :disabled="!interactionStore.canPasteInto(target.id)"
        @select="handlePaste(target.id)"
      >
        <Clipboard :size="16" aria-hidden />
        <Menu.ItemText :class="menuClasses.itemText">Paste</Menu.ItemText>
      </Menu.Item>
      <Menu.Separator :class="menuClasses.separator" />
      <Menu.Item :class="menuClasses.item" value="rename" @select="handleRenameFolder(target)">
        <Pencil :size="16" aria-hidden />
        <Menu.ItemText :class="menuClasses.itemText">Rename</Menu.ItemText>
      </Menu.Item>
      <Menu.Item :class="cx(menuClasses.item, dangerClass)" value="delete" @select="handleDeleteFolder(target)">
        <Trash2 :size="16" aria-hidden />
        <Menu.ItemText :class="menuClasses.itemText">Delete</Menu.ItemText>
      </Menu.Item>
    </Menu.ItemGroup>
  </template>

  <!-- File item menu -->
  <template v-else-if="target">
    <Menu.Item :class="menuClasses.item" value="open" @select="handleOpenFile(target)">
      <ExternalLink :size="16" aria-hidden />
      <Menu.ItemText :class="menuClasses.itemText">Open</Menu.ItemText>
    </Menu.Item>
    <Menu.Item :class="menuClasses.item" value="download" @select="handleDownloadFile(target)">
      <Download :size="16" aria-hidden />
      <Menu.ItemText :class="menuClasses.itemText">Download</Menu.ItemText>
    </Menu.Item>
    <Menu.Separator :class="menuClasses.separator" />
    <Menu.Item :class="menuClasses.item" value="copy" @select="interactionStore.copySelection(target.id)">
      <Copy :size="16" aria-hidden />
      <Menu.ItemText :class="menuClasses.itemText">Copy</Menu.ItemText>
    </Menu.Item>
    <Menu.Item :class="menuClasses.item" value="cut" @select="interactionStore.cutSelection(target.id)">
      <Scissors :size="16" aria-hidden />
      <Menu.ItemText :class="menuClasses.itemText">Cut</Menu.ItemText>
    </Menu.Item>
    <Menu.Item
      :class="menuClasses.item"
      value="paste"
      :disabled="!interactionStore.canPasteInto(store.selectedEntryId)"
      @select="handlePaste(store.selectedEntryId)"
    >
      <Clipboard :size="16" aria-hidden />
      <Menu.ItemText :class="menuClasses.itemText">Paste</Menu.ItemText>
    </Menu.Item>
    <Menu.Separator :class="menuClasses.separator" />
    <Menu.Item :class="menuClasses.item" value="rename" @select="handleRenameFile(target)">
      <Pencil :size="16" aria-hidden />
      <Menu.ItemText :class="menuClasses.itemText">Rename</Menu.ItemText>
    </Menu.Item>
    <Menu.Item :class="cx(menuClasses.item, dangerClass)" value="delete" @select="handleDeleteFile(target)">
      <Trash2 :size="16" aria-hidden />
      <Menu.ItemText :class="menuClasses.itemText">Delete</Menu.ItemText>
    </Menu.Item>
  </template>

  <!-- Container / blank area menu -->
  <template v-else>
    <Menu.Item :class="menuClasses.item" value="upload-files" @select="handleUploadFiles(targetFolderId)">
      <Upload :size="16" aria-hidden />
      <Menu.ItemText :class="menuClasses.itemText">Upload Files</Menu.ItemText>
    </Menu.Item>
    <Menu.Item :class="menuClasses.item" value="upload-folder" @select="handleUploadFolder(targetFolderId)">
      <FolderPlus :size="16" aria-hidden />
      <Menu.ItemText :class="menuClasses.itemText">Upload Folder</Menu.ItemText>
    </Menu.Item>
    <Menu.Item
      :class="menuClasses.item"
      value="paste"
      :disabled="!interactionStore.canPasteInto(targetFolderId)"
      @select="handlePaste(targetFolderId)"
    >
      <Clipboard :size="16" aria-hidden />
      <Menu.ItemText :class="menuClasses.itemText">Paste</Menu.ItemText>
    </Menu.Item>
    <Menu.Separator :class="menuClasses.separator" />
    <Menu.Item :class="menuClasses.item" value="create-folder" @select="handleCreateFolder(targetFolderId)">
      <Folder :size="16" aria-hidden />
      <Menu.ItemText :class="menuClasses.itemText">Create Folder</Menu.ItemText>
    </Menu.Item>
  </template>
</template>
