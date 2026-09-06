<script setup lang="ts">
import { Upload } from "@lucide/vue";
import { css } from "@styled-system/css";
import { ref } from "vue";

import { useAssetsInteractionStore } from "./assets-interaction-store";
import { processUploadBatch } from "./upload-helpers";

const interaction = useAssetsInteractionStore();
const isDragOver = ref(false);

function handleDragOver(e: DragEvent) {
  if (interaction.isInternalDragData(e.dataTransfer)) return;
  e.preventDefault();
  e.stopPropagation();
  isDragOver.value = true;
}

function handleDragLeave(e: DragEvent) {
  if (interaction.isInternalDragData(e.dataTransfer)) return;
  // Ignore dragleave if moving to a child element inside the upload zone
  if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return;
  e.preventDefault();
  e.stopPropagation();
  isDragOver.value = false;
}

async function collectFilesAndFolders(
  entry: FileSystemEntry,
  pathParts: string[],
  result: { isFile: boolean; file?: File; pathParts: string[] }[],
): Promise<void> {
  if (entry.isFile) {
    return new Promise((resolve) => {
      (entry as FileSystemFileEntry).file((file: File) => {
        result.push({ isFile: true, file, pathParts });
        resolve();
      });
    });
  }
  if (entry.isDirectory) {
    const newPathParts = [...pathParts, entry.name];
    result.push({ isFile: false, pathParts: newPathParts });
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    return new Promise((resolve) => {
      const readEntries = () => {
        reader.readEntries(async (entries: FileSystemEntry[]) => {
          if (entries.length > 0) {
            const promises = entries.map((child) =>
              collectFilesAndFolders(child, newPathParts, result),
            );
            await Promise.all(promises);
            readEntries();
          } else {
            resolve();
          }
        });
      };
      readEntries();
    });
  }
}

type CollectedDrop = { isFile: boolean; file?: File; pathParts: string[] };

function resolveDropFolderId(e: DragEvent): string | null {
  const dropTarget = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
  const targetEntryId =
    dropTarget?.closest<HTMLElement>("[data-entry-id]")?.dataset.entryId ?? null;
  return interaction.resolveDropUploadTarget(targetEntryId);
}

function collectItemFile(item: DataTransferItem, collected: CollectedDrop[]): Promise<void> | undefined {
  const entry = item.webkitGetAsEntry();
  if (entry) return collectFilesAndFolders(entry, [], collected);
  const file = item.getAsFile();
  if (file) collected.push({ isFile: true, file, pathParts: [] });
  return undefined;
}

async function collectFromItems(
  items: DataTransferItemList,
  collected: CollectedDrop[],
): Promise<void> {
  const promises: Promise<void>[] = [];
  for (const item of Array.from(items)) {
    if (item.kind !== "file") continue;
    const pending = collectItemFile(item, collected);
    if (pending) promises.push(pending);
  }
  await Promise.all(promises);
}

function collectFromFiles(files: FileList | undefined, collected: CollectedDrop[]) {
  if (!files) return;
  for (const file of Array.from(files)) {
    collected.push({ isFile: true, file, pathParts: [] });
  }
}

async function handleDrop(e: DragEvent) {
  if (interaction.isInternalDragData(e.dataTransfer)) return;

  e.preventDefault();
  e.stopPropagation();
  isDragOver.value = false;

  const targetFolderId = resolveDropFolderId(e);
  const collected: CollectedDrop[] = [];
  const items = e.dataTransfer?.items;
  if (items) await collectFromItems(items, collected);
  else collectFromFiles(e.dataTransfer?.files, collected);

  processUploadBatch(targetFolderId, collected);
}

const overlayClass = css({
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  bg: "bg.subtle/80",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 3,
  zIndex: 100,
});
</script>

<template>
  <!-- biome-ignore lint/a11y/noStaticElementInteractions: external-file drop target; children remain interactive -->
  <div
    :class="css({ position: 'relative', h: 'full' })"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <slot />

    <div v-if="isDragOver" :class="overlayClass">
      <Upload :size="32" aria-hidden />
      <p :class="css({ fontSize: 'lg', fontWeight: 'medium', margin: 0 })">
        Drop files to upload
      </p>
    </div>
  </div>
</template>
