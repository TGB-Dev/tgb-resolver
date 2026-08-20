<script setup lang="ts">
import { Box, Grid } from "@styled-system/jsx";
import { ref } from "vue";

import { toaster } from "@/features/shared/ui/toaster";

import { INTERNAL_DRAG_MIME, useAssetsInteractionStore } from "./assets-interaction-store";
import { useAssetsManagerStore } from "./assets-manager-store";
import ContextMenuOverlay from "./context-menu-overlay.vue";
import EntryRow from "./entry-row.vue";
import type { FsEntry } from "./types";
import { useEntryContextMenu } from "./use-entry-context-menu";
import { useRubberBandSelect } from "./use-rubber-band-select";

const store = useAssetsManagerStore();
const interactionStore = useAssetsInteractionStore();
const contextMenu = useEntryContextMenu();
const containerRef = ref<HTMLElement | null>(null);

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

const { selectionRect, containerHandlers } = useRubberBandSelect(containerRef, (ids, mod) => {
  if (mod) {
    const next = new Set(store.selectedIds);
    for (const id of ids) next.add(id);
    store.selectedIds = next;
  } else {
    store.selectedIds = new Set(ids);
  }
});

function handleContainerClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (target.closest("[data-context-menu]")) return;
  if (contextMenu.state.value.isOpen) return;
  if (target.closest("[data-entry-id]")) return;
  store.clearSelection();
}

function handleEntryClick(e: MouseEvent, index: number) {
  store.handleEntryClick(e, index);
}

function handleDoubleClick(entry: FsEntry) {
  if (entry.isDirectory) {
    store.selectEntry(entry.id);
  } else {
    window.open(`${API_URL}/assets/${entry.id}`, "_blank");
  }
}

function handleDropError(error: unknown): void {
  toaster.create({
    title: "Move assets",
    description: error instanceof Error ? error.message : String(error),
    type: "error",
  });
}
</script>

<template>
  <Box
    ref="containerRef"
    overflowY="auto"
    h="full"
    userSelect="none"
    tabindex="-1"
    @click="handleContainerClick"
    @contextmenu="(e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-entry-id]')) {
        contextMenu.openForContainer(e);
      }
    }"
    @pointerdown="(e) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-context-menu]')) return;
      store.focusedPanel = 'content';
      containerHandlers.onPointerDown(e);
    }"
    @pointermove="containerHandlers.onPointerMove"
    @pointerup="containerHandlers.onPointerUp"
    @click.capture="(e) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-context-menu]')) return;
      containerHandlers.onClickCapture(e);
    }"
    @keydown.esc="store.clearSelection"
    @dragover="(e) => {
      if (!interactionStore.isInternalDragData(e.dataTransfer)) return;
      e.preventDefault();
      const effect = e.altKey ? 'copy' : 'move';
      interactionStore.setDragEffect(effect);
      if (e.dataTransfer) e.dataTransfer.dropEffect = effect;
    }"
    @drop="async (e) => {
      if (!interactionStore.isInternalDragData(e.dataTransfer)) return;
      e.preventDefault();
      const effect = e.altKey ? 'copy' : 'move';
      try {
        await interactionStore.dropInto(store.selectedEntryId, effect);
      } catch (err) {
        handleDropError(err);
      }
    }"
  >
    <Box
      v-if="store.entries.length === 0"
      display="flex"
      alignItems="center"
      justifyContent="center"
      h="full"
      color="fg.muted"
    >
      This folder is empty
    </Box>

    <template v-else>
      <Grid
        templateColumns="1fr 120px 100px"
        gap="0"
        fontWeight="medium"
        fontSize="sm"
        color="fg.muted"
        px="4"
        py="2"
        borderBottomWidth="1"
        borderColor="border"
      >
        <Box>Name</Box>
        <Box>Size</Box>
        <Box>Type</Box>
      </Grid>
      <EntryRow
        v-for="(entry, index) in store.entries"
        :key="entry.id"
        :entry="entry"
        :is-selected="store.selectedIds.has(entry.id)"
        @click="handleEntryClick($event, index)"
        @dblclick="handleDoubleClick(entry)"
        @contextmenu="(e) => {
          if (!store.selectedIds.has(entry.id)) {
            store.selectedIds = new Set([entry.id]);
          }
          contextMenu.openForEntry(e, {
            id: entry.id,
            name: entry.name,
            isDirectory: entry.isDirectory,
          });
        }"
        @dragstart="(e) => {
          const effect = e.altKey ? 'copy' : 'move';
          const dragIds = interactionStore.beginDrag(entry.id, effect);
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'copyMove';
            e.dataTransfer.setData(INTERNAL_DRAG_MIME, JSON.stringify(dragIds));
          }
        }"
        @dragend="interactionStore.clearDrag"
        @dragover="(e) => {
          if (!interactionStore.isInternalDragData(e.dataTransfer)) return;
          e.preventDefault();
          const effect = e.altKey ? 'copy' : 'move';
          interactionStore.setDragEffect(effect);
          if (e.dataTransfer) e.dataTransfer.dropEffect = effect;
        }"
        @drop="async (e) => {
          if (!interactionStore.isInternalDragData(e.dataTransfer)) return;
          e.preventDefault();
          e.stopPropagation();
          const effect = e.altKey ? 'copy' : 'move';
          try {
            await interactionStore.dropInto(entry.id, effect);
          } catch (err) {
            handleDropError(err);
          }
        }"
      />
    </template>

    <Box
      v-if="selectionRect"
      position="fixed"
      :left="`${selectionRect.left}px`"
      :top="`${selectionRect.top}px`"
      :width="`${selectionRect.width}px`"
      :height="`${selectionRect.height}px`"
      bg="colorPalette.solid/10"
      borderWidth="1"
      borderColor="colorPalette.solid"
      pointerEvents="none"
      zIndex="floating"
    />

    <ContextMenuOverlay :state="contextMenu.state.value" @close="contextMenu.close" />
  </Box>
</template>
