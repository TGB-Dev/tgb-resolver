<script setup lang="ts">
import { Box, VStack } from "@styled-system/jsx";

import Button from "@/features/shared/ui/button.vue";
import { toaster } from "@/features/shared/ui/toaster";
import { useConfirmActionStore } from "@/stores/confirm-action-store";

import { useAssetsInteractionStore } from "./assets-interaction-store";
import { useAssetsManagerStore } from "./assets-manager-store";
import { processUploadBatch } from "./upload-helpers";
import type { ContextMenuState } from "./use-entry-context-menu";

defineProps<{
  state: ContextMenuState;
}>();

const emit = defineEmits<{
  close: [];
}>();

const store = useAssetsManagerStore();
const interactionStore = useAssetsInteractionStore();
const confirmStore = useConfirmActionStore();

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

function handleOperationError(error: unknown, label: string): void {
  const description = error instanceof Error ? error.message : String(error);
  toaster.create({ title: label, description, type: "error" });
}

function handleOpenFile(target: NonNullable<ContextMenuState["target"]>) {
  emit("close");
  window.open(`${API_URL}/assets/${target.id}`, "_blank");
}

function handleDownloadFile(target: NonNullable<ContextMenuState["target"]>) {
  emit("close");
  const a = document.createElement("a");
  a.href = `${API_URL}/assets/${target.id}`;
  a.download = target.name;
  a.click();
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
  emit("close");
  if (files) {
    const items = Array.from(files).map((f) => ({ isFile: true, file: f, pathParts: [] }));
    processUploadBatch(folderId, items, () => {});
  }
}

async function handleUploadFolder(folderId: string | null) {
  const files = await promptDirectory();
  emit("close");
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
  emit("close");
  if (name?.trim()) {
    try {
      await store.createFolder(folderId, name.trim());
    } catch (err) {
      handleOperationError(err, "Create Folder");
    }
  }
}

async function handlePaste(folderId: string | null) {
  emit("close");
  try {
    await interactionStore.pasteInto(folderId);
  } catch (err) {
    handleOperationError(err, "Paste");
  }
}

async function handleRenameFile(target: NonNullable<ContextMenuState["target"]>) {
  emit("close");
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

async function handleRenameFolder(target: NonNullable<ContextMenuState["target"]>) {
  emit("close");
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

async function handleDeleteFolder(target: NonNullable<ContextMenuState["target"]>) {
  emit("close");
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
  <Box
    v-if="state.isOpen"
    data-context-menu
    position="fixed"
    :left="`${state.x}px`"
    :top="`${state.y}px`"
    zIndex="popover"
    bg="bg.panel"
    borderWidth="1"
    borderColor="border"
    rounded="md"
    shadow="lg"
    py="1"
    minW="180px"
  >
    <!-- Folder Item Context Menu -->
    <VStack v-if="state.target?.isDirectory" alignItems="stretch" gap="0">
      <Box px="3" py="1" fontSize="xs" color="fg.muted" fontWeight="medium">
        {{ state.target.name }}
      </Box>
      <Box h="px" bg="border" my="1" />
      <Button variant="ghost" size="sm" justifyContent="flex-start" @click="handleUploadFiles(state.target.id)">
        Upload Files
      </Button>
      <Button variant="ghost" size="sm" justifyContent="flex-start" @click="handleUploadFolder(state.target.id)">
        Upload Folder
      </Button>
      <Button variant="ghost" size="sm" justifyContent="flex-start" @click="handleCreateFolder(state.target.id)">
        Create Folder
      </Button>
      <Button variant="ghost" size="sm" justifyContent="flex-start" @click="() => { emit('close'); if (state.target) interactionStore.copySelection(state.target.id); }">
        Copy
      </Button>
      <Button variant="ghost" size="sm" justifyContent="flex-start" @click="() => { emit('close'); if (state.target) interactionStore.cutSelection(state.target.id); }">
        Cut
      </Button>
      <Button
        variant="ghost"
        size="sm"
        justifyContent="flex-start"
        :disabled="!interactionStore.canPasteInto(state.target.id)"
        @click="handlePaste(state.target.id)"
      >
        Paste
      </Button>
      <Box h="px" bg="border" my="1" />
      <Button variant="ghost" size="sm" justifyContent="flex-start" @click="handleRenameFolder(state.target)">
        Rename
      </Button>
      <Button variant="ghost" size="sm" colorPalette="red" justifyContent="flex-start" @click="handleDeleteFolder(state.target)">
        Delete
      </Button>
    </VStack>

    <!-- File Item Context Menu -->
    <VStack v-else-if="state.target" alignItems="stretch" gap="0">
      <Button
        variant="ghost"
        size="sm"
        justifyContent="flex-start"
        @click="handleOpenFile(state.target)"
      >
        Open
      </Button>
      <Button
        variant="ghost"
        size="sm"
        justifyContent="flex-start"
        @click="handleDownloadFile(state.target)"
      >
        Download
      </Button>
      <Box h="px" bg="border" my="1" />
      <Button variant="ghost" size="sm" justifyContent="flex-start" @click="() => { emit('close'); if (state.target) interactionStore.copySelection(state.target.id); }">
        Copy
      </Button>
      <Button variant="ghost" size="sm" justifyContent="flex-start" @click="() => { emit('close'); if (state.target) interactionStore.cutSelection(state.target.id); }">
        Cut
      </Button>
      <Button
        variant="ghost"
        size="sm"
        justifyContent="flex-start"
        :disabled="!interactionStore.canPasteInto(store.selectedEntryId)"
        @click="handlePaste(store.selectedEntryId)"
      >
        Paste
      </Button>
      <Box h="px" bg="border" my="1" />
      <Button variant="ghost" size="sm" justifyContent="flex-start" @click="handleRenameFile(state.target)">
        Rename
      </Button>
      <Button variant="ghost" size="sm" colorPalette="red" justifyContent="flex-start" @click="handleDeleteFile(state.target)">
        Delete
      </Button>
    </VStack>

    <!-- Container / Blank Area Context Menu -->
    <VStack v-else alignItems="stretch" gap="0">
      <Button variant="ghost" size="sm" justifyContent="flex-start" @click="handleUploadFiles(state.targetFolderId)">
        Upload Files
      </Button>
      <Button variant="ghost" size="sm" justifyContent="flex-start" @click="handleUploadFolder(state.targetFolderId)">
        Upload Folder
      </Button>
      <Button
        variant="ghost"
        size="sm"
        justifyContent="flex-start"
        :disabled="!interactionStore.canPasteInto(state.targetFolderId)"
        @click="handlePaste(state.targetFolderId)"
      >
        Paste
      </Button>
      <Box h="px" bg="border" my="1" />
      <Button variant="ghost" size="sm" justifyContent="flex-start" @click="handleCreateFolder(state.targetFolderId)">
        Create Folder
      </Button>
    </VStack>
  </Box>
</template>
