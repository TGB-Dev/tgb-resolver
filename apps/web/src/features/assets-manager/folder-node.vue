<script setup lang="ts">
import { Folder, FolderOpen } from "@lucide/vue";
import { css } from "@styled-system/css";
import { computed } from "vue";

import { parseErrorMessage } from "@/features/shared/ui/error-message";
import { toaster } from "@/features/shared/ui/toaster";

import { INTERNAL_DRAG_MIME, useAssetsInteractionStore } from "./assets-interaction-store";
import { useAssetsManagerStore } from "./assets-manager-store";
import { folderNodeClass } from "./folder-node-recipe";
import { DropEffect, FocusedPanel, type FsEntry } from "./types";

const props = defineProps<{
  node: FsEntry;
}>();

const emit = defineEmits<{
  contextmenu: [
    event: MouseEvent,
    target: { id: string; name: string; isDirectory: boolean } | null,
  ];
}>();

const store = useAssetsManagerStore();
const interactionStore = useAssetsInteractionStore();

// Template inline handlers cannot reference enum members directly
// (vue-tsc unwraps them as refs), so alias the members used below.
const copyEffect = DropEffect.Copy;
const moveEffect = DropEffect.Move;

const isExpanded = computed(() => store.expandedFolderIds.has(props.node.id));
const isSelected = computed(() => store.selectedEntryId === props.node.id);
const isDropTarget = computed(() => interactionStore.dropTargetId === props.node.id);

function handleDropError(error: unknown): void {
  toaster.create({
    title: "Move assets",
    description: parseErrorMessage(error),
    type: "error",
  });
}

function handleClick() {
  const isSameFolder = store.selectedEntryId === props.node.id;
  const isNowExpanded = isExpanded.value;
  const hasChildren = !!(props.node.children && props.node.children.length > 0);

  store.focusedPanel = FocusedPanel.Tree;
  store.selectEntry(props.node.id);

  if (hasChildren) {
    if (isSameFolder || !isNowExpanded) {
      store.toggleFolder(props.node.id);
    }
  }
}
</script>

<template>
  <div>
    <button
      type="button"
      :class="folderNodeClass({ selected: isSelected, dropTarget: isDropTarget })"
      draggable="true"
      @click="handleClick"
      @contextmenu.stop.prevent="emit('contextmenu', $event, { id: node.id, name: node.name, isDirectory: true })"
      @dragstart="(e) => {
        const effect = e.altKey ? copyEffect : moveEffect;
        const dragIds = interactionStore.beginDrag(node.id, effect);
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'copyMove';
          e.dataTransfer.setData(INTERNAL_DRAG_MIME, JSON.stringify(dragIds));
        }
      }"
      @dragend="interactionStore.clearDrag"
      @dragover.prevent.stop="(e) => {
        if (!interactionStore.isInternalDragData(e.dataTransfer)) return;
        interactionStore.setDropTarget(node.id);
        if (e.dataTransfer) e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
      }"
      @dragleave="(e) => {
        if ((e.currentTarget as HTMLElement)?.contains(e.relatedTarget as Node)) return;
        if (interactionStore.dropTargetId === node.id) {
          interactionStore.setDropTarget(null);
        }
      }"
      @drop.prevent.stop="async (e) => {
        if (!interactionStore.isInternalDragData(e.dataTransfer)) return;
        interactionStore.setDropTarget(node.id);
        try {
          await interactionStore.dropInto(node.id, e.altKey ? copyEffect : moveEffect);
        } catch (err) {
          handleDropError(err);
        }
      }"
    >
      <FolderOpen v-if="isExpanded" :size="14" aria-hidden />
      <Folder v-else :size="14" aria-hidden />
      <span>{{ node.name }}</span>
      <span v-if="isDropTarget" :class="css({ ms: 'auto', fontSize: 'xs' })">
        Drop here
      </span>
    </button>

    <div v-if="isExpanded && node.children && node.children.length > 0" :class="css({ pl: '4' })">
      <FolderNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        @contextmenu="(event, target) => emit('contextmenu', event, target)"
      />
    </div>
  </div>
</template>
