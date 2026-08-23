<script setup lang="ts">
import { Clipboard, Copy, Download, ExternalLink, FolderPlus, Pencil, Scissors, Trash2, Upload } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { button } from "@styled-system/recipes";

import { toaster } from "@/features/shared/ui/toaster";
import { useConfirmActionStore } from "@/stores/confirm-action-store";

import { useAssetsInteractionStore } from "./assets-interaction-store";
import { useAssetsManagerStore } from "./assets-manager-store";
import { processUploadBatch } from "./upload-helpers";
import type { ContextMenuState } from "./use-entry-context-menu";

const props = defineProps<{ state: ContextMenuState }>();
const emit = defineEmits<{ close: [] }>();

const store = useAssetsManagerStore();
const interactionStore = useAssetsInteractionStore();
const confirmStore = useConfirmActionStore();

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

const boxClass = css({
  position: "fixed",
  zIndex: "popover",
  bg: "bg.panel",
  borderWidth: 1,
  borderColor: "border",
  rounded: "md",
  shadow: "lg",
  py: "1",
  minW: "180px",
});

// Chakra MenuItemButton equivalent: ghost sm button stretched across the menu.
const itemClass = cx(
  button({ variant: "ghost", size: "sm" }),
  css({
    w: "full",
    justifyContent: "flex-start",
    fontWeight: "normal",
    px: "3",
    borderRadius: "none",
  }),
);
const dangerItemClass = css({ color: "fg.error", _hover: { bg: "bg.error", color: "fg.error" } });
const disabledItemClass = css({ opacity: 0.5, cursor: "not-allowed" });
const separatorClass = css({ height: "1px", bg: "border", my: "1" });
const labelClass = css({ px: "3", py: "1", fontSize: "xs", color: "fg.muted", fontWeight: "medium" });

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
  emit("close");
  const files = await promptFiles();
  if (files) {
    const items = Array.from(files).map((f) => ({ isFile: true, file: f, pathParts: [] }));
    processUploadBatch(folderId, items, () => {});
  }
}

async function handleUploadFolder(folderId: string | null) {
  emit("close");
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
  emit("close");
  const name = await confirmStore.promptAction({
    title: "Create Folder",
    label: "Folder name",
    confirmLabel: "Create",
  });
  if (name?.trim()) {
    await store
      .createFolder(folderId, name.trim())
      .catch((error) => handleOperationError(error, "Create Folder"));
  }
}

async function handlePaste(folderId: string | null) {
  emit("close");
  try {
    await interactionStore.pasteInto(folderId);
  } catch (error) {
    handleOperationError(error, "Paste");
  }
}

function handleOpenFile(id: string) {
  emit("close");
  window.open(`${API_URL}/assets/${id}`, "_blank");
}

function handleDownloadFile(target: NonNullable<ContextMenuState["target"]>) {
  emit("close");
  const a = document.createElement("a");
  a.href = `${API_URL}/assets/${target.id}`;
  a.download = target.name;
  a.click();
}

function handleCopy(id: string) {
  emit("close");
  interactionStore.copySelection(id);
}

function handleCut(id: string) {
  emit("close");
  interactionStore.cutSelection(id);
}

async function handleRename(target: NonNullable<ContextMenuState["target"]>, isDirectory: boolean) {
  emit("close");
  const name = await confirmStore.promptAction({
    title: isDirectory ? "Rename Folder" : "Rename File",
    label: "New name",
    defaultValue: target.name,
    confirmLabel: "Rename",
  });
  if (name?.trim()) {
    store.renameEntry(target.id, isDirectory, name.trim());
  }
}

async function handleDeleteFile(target: NonNullable<ContextMenuState["target"]>) {
  emit("close");
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

async function handleDeleteFolder() {
  emit("close");
  const accepted = await confirmStore.confirmAction({
    title: "Delete Folder",
    message: "Delete this folder and its contents?",
    confirmLabel: "Delete",
    cancelLabel: "Cancel",
  });
  if (accepted && props.state.target) {
    store.deleteEntry(props.state.target.id, true);
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="state.isOpen"
      data-context-menu
      :class="boxClass"
      :style="{ left: `${state.x}px`, top: `${state.y}px` }"
    >
      <!-- Folder item menu -->
      <template v-if="state.target?.isDirectory">
        <p :class="labelClass">{{ state.target.name }}</p>
        <div :class="separatorClass" />
        <button type="button" :class="itemClass" @click="handleUploadFiles(state.target.id)">
          <Upload :size="16" aria-hidden /> Upload Files
        </button>
        <button type="button" :class="itemClass" @click="handleUploadFolder(state.target.id)">
          <FolderPlus :size="16" aria-hidden /> Upload Folder
        </button>
        <button type="button" :class="itemClass" @click="handleCreateFolder(state.target.id)">
          Create Folder
        </button>
        <div :class="separatorClass" />
        <button type="button" :class="itemClass" @click="handleCopy(state.target.id)">
          <Copy :size="16" aria-hidden /> Copy
        </button>
        <button type="button" :class="itemClass" @click="handleCut(state.target.id)">
          <Scissors :size="16" aria-hidden /> Cut
        </button>
        <button
          type="button"
          :class="[itemClass, !interactionStore.canPasteInto(state.target.id) ? disabledItemClass : '']"
          :disabled="!interactionStore.canPasteInto(state.target.id)"
          @click="handlePaste(state.target.id)"
        >
          <Clipboard :size="16" aria-hidden /> Paste
        </button>
        <div :class="separatorClass" />
        <button type="button" :class="itemClass" @click="handleRename(state.target, true)">
          <Pencil :size="16" aria-hidden /> Rename
        </button>
        <button type="button" :class="[itemClass, dangerItemClass]" @click="handleDeleteFolder()">
          <Trash2 :size="16" aria-hidden /> Delete
        </button>
      </template>

      <!-- File item menu -->
      <template v-else-if="state.target">
        <button type="button" :class="itemClass" @click="handleOpenFile(state.target.id)">
          <ExternalLink :size="16" aria-hidden /> Open
        </button>
        <button type="button" :class="itemClass" @click="handleDownloadFile(state.target)">
          <Download :size="16" aria-hidden /> Download
        </button>
        <div :class="separatorClass" />
        <button type="button" :class="itemClass" @click="handleCopy(state.target.id)">
          <Copy :size="16" aria-hidden /> Copy
        </button>
        <button type="button" :class="itemClass" @click="handleCut(state.target.id)">
          <Scissors :size="16" aria-hidden /> Cut
        </button>
        <button
          type="button"
          :class="[
            itemClass,
            !interactionStore.canPasteInto(store.selectedEntryId) ? disabledItemClass : '',
          ]"
          :disabled="!interactionStore.canPasteInto(store.selectedEntryId)"
          @click="handlePaste(store.selectedEntryId)"
        >
          <Clipboard :size="16" aria-hidden /> Paste
        </button>
        <div :class="separatorClass" />
        <button type="button" :class="itemClass" @click="handleRename(state.target, false)">
          <Pencil :size="16" aria-hidden /> Rename
        </button>
        <button type="button" :class="[itemClass, dangerItemClass]" @click="handleDeleteFile(state.target)">
          <Trash2 :size="16" aria-hidden /> Delete
        </button>
      </template>

      <!-- Container / blank area menu -->
      <template v-else>
        <button type="button" :class="itemClass" @click="handleUploadFiles(state.targetFolderId)">
          <Upload :size="16" aria-hidden /> Upload Files
        </button>
        <button type="button" :class="itemClass" @click="handleUploadFolder(state.targetFolderId)">
          <FolderPlus :size="16" aria-hidden /> Upload Folder
        </button>
        <button
          type="button"
          :class="[
            itemClass,
            !interactionStore.canPasteInto(state.targetFolderId) ? disabledItemClass : '',
          ]"
          :disabled="!interactionStore.canPasteInto(state.targetFolderId)"
          @click="handlePaste(state.targetFolderId)"
        >
          <Clipboard :size="16" aria-hidden /> Paste
        </button>
        <div :class="separatorClass" />
        <button type="button" :class="itemClass" @click="handleCreateFolder(state.targetFolderId)">
          Create Folder
        </button>
      </template>
    </div>
  </Teleport>
</template>
