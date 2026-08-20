<script setup lang="ts">
import { ChevronsDownUp, ChevronsUpDown, Folder } from "@lucide/vue";
import { Box, HStack } from "@styled-system/jsx";
import { computed } from "vue";

import IconButton from "@/features/shared/ui/icon-button.vue";

import { useAssetsInteractionStore } from "./assets-interaction-store";
import { useAssetsManagerStore } from "./assets-manager-store";
import ContextMenuOverlay from "./context-menu-overlay.vue";
import FolderNode from "./folder-node.vue";
import { useEntryContextMenu } from "./use-entry-context-menu";

const store = useAssetsManagerStore();
const interactionStore = useAssetsInteractionStore();
const contextMenu = useEntryContextMenu();

const isAllAssetsSelected = computed(() => store.selectedEntryId === null);
const isAllAssetsDropTarget = computed(
  () => interactionStore.dropTargetId === null && interactionStore.dragState !== null,
);

function handleContextMenu(
  e: MouseEvent,
  target: { id: string; name: string; isDirectory: boolean } | null,
) {
  const isOnButton = (e.target as HTMLElement).closest("button");
  if (!target && isOnButton) return;
  if (target) {
    contextMenu.openForEntry(e, target);
    return;
  }
  contextMenu.openForContainer(e);
}
</script>

<template>
  <Box
    overflowY="auto"
    h="full"
    px="2"
    pt="2"
    @pointerdown="store.focusedPanel = 'tree'"
    @contextmenu="handleContextMenu($event, null)"
    @dragover="(e) => {
      if (!interactionStore.isInternalDragData(e.dataTransfer)) return;
      e.preventDefault();
      e.stopPropagation();
      interactionStore.setDropTarget(null);
      if (e.dataTransfer) e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
    }"
    @drop="(e) => {
      if (!interactionStore.isInternalDragData(e.dataTransfer)) return;
      e.preventDefault();
      interactionStore.setDropTarget(null);
      void interactionStore.dropInto(null, e.altKey ? 'copy' : 'move');
    }"
  >
    <Box display="flex" alignItems="center" justifyContent="space-between" px="1" mb="1">
      <Box
        as="button"
        display="flex"
        alignItems="center"
        gap="2"
        w="full"
        px="2"
        py="1.5"
        fontSize="sm"
        fontWeight="normal"
        cursor="pointer"
        borderLeftWidth="3"
        :borderLeftColor="isAllAssetsDropTarget || isAllAssetsSelected ? 'colorPalette.border' : 'transparent'"
        :bg="isAllAssetsDropTarget ? 'bg.muted' : isAllAssetsSelected ? 'bg.muted' : undefined"
        :color="isAllAssetsSelected ? 'colorPalette' : undefined"
        :_hover="{ bg: 'bg.subtle' }"
        @click="() => {
          store.focusedPanel = 'tree';
          store.selectEntry(null);
        }"
      >
        <Folder :size="14" aria-hidden />
        <Box as="span">All Assets</Box>
      </Box>

      <HStack gap="0">
        <IconButton
          ariaLabel="Expand all folders"
          size="xs"
          variant="ghost"
          @click="store.expandAll"
        >
          <ChevronsUpDown :size="14" aria-hidden />
        </IconButton>
        <IconButton
          ariaLabel="Collapse all folders"
          size="xs"
          variant="ghost"
          @click="store.collapseAll"
        >
          <ChevronsDownUp :size="14" aria-hidden />
        </IconButton>
      </HStack>
    </Box>

    <Box pl="4">
      <FolderNode
        v-for="folder in store.folderTree"
        :key="folder.id"
        :node="folder"
        @contextmenu="handleContextMenu"
      />
    </Box>

    <ContextMenuOverlay :state="contextMenu.state.value" @close="contextMenu.close" />
  </Box>
</template>
