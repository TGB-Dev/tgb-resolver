<script setup lang="ts">
import {
  Clipboard,
  Copy,
  Download,
  ExternalLink,
  FolderPlus,
  Pencil,
  Scissors,
  Trash2,
  Upload,
} from "@lucide/vue";
import { css } from "@styled-system/css";

import { useAssetsInteractionStore } from "./assets-interaction-store";
import { useAssetsManagerStore } from "./assets-manager-store";
import EntryMenuItem from "./entry-menu-item.vue";
import type { ContextMenuState } from "./use-entry-context-menu";
import { useEntryMenuActions } from "./use-entry-menu-actions";

const props = defineProps<{ state: ContextMenuState }>();
const emit = defineEmits<{ close: [] }>();

const store = useAssetsManagerStore();
const interactionStore = useAssetsInteractionStore();

const actions = useEntryMenuActions(() => emit("close"), () => props.state);

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
const separatorClass = css({ height: "1px", bg: "border", my: "1" });
const labelClass = css({ px: "3", py: "1", fontSize: "xs", color: "fg.muted", fontWeight: "medium" });
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
        <EntryMenuItem :icon="Upload" @click="actions.handleUploadFiles(state.target.id)">
          Upload Files
        </EntryMenuItem>
        <EntryMenuItem :icon="FolderPlus" @click="actions.handleUploadFolder(state.target.id)">
          Upload Folder
        </EntryMenuItem>
        <EntryMenuItem @click="actions.handleCreateFolder(state.target.id)">
          Create Folder
        </EntryMenuItem>
        <div :class="separatorClass" />
        <EntryMenuItem :icon="Copy" @click="actions.handleCopy(state.target.id)">Copy</EntryMenuItem>
        <EntryMenuItem :icon="Scissors" @click="actions.handleCut(state.target.id)">Cut</EntryMenuItem>
        <EntryMenuItem
          :icon="Clipboard"
          :disabled="!interactionStore.canPasteInto(state.target.id)"
          @click="actions.handlePaste(state.target.id)"
        >
          Paste
        </EntryMenuItem>
        <div :class="separatorClass" />
        <EntryMenuItem :icon="Pencil" @click="actions.handleRename(state.target, true)">
          Rename
        </EntryMenuItem>
        <EntryMenuItem :icon="Trash2" danger @click="actions.handleDeleteFolder()">
          Delete
        </EntryMenuItem>
      </template>

      <!-- File item menu -->
      <template v-else-if="state.target">
        <EntryMenuItem :icon="ExternalLink" @click="actions.handleOpenFile(state.target.id)">
          Open
        </EntryMenuItem>
        <EntryMenuItem :icon="Download" @click="actions.handleDownloadFile(state.target)">
          Download
        </EntryMenuItem>
        <div :class="separatorClass" />
        <EntryMenuItem :icon="Copy" @click="actions.handleCopy(state.target.id)">Copy</EntryMenuItem>
        <EntryMenuItem :icon="Scissors" @click="actions.handleCut(state.target.id)">Cut</EntryMenuItem>
        <EntryMenuItem
          :icon="Clipboard"
          :disabled="!interactionStore.canPasteInto(store.selectedEntryId)"
          @click="actions.handlePaste(store.selectedEntryId)"
        >
          Paste
        </EntryMenuItem>
        <div :class="separatorClass" />
        <EntryMenuItem :icon="Pencil" @click="actions.handleRename(state.target, false)">
          Rename
        </EntryMenuItem>
        <EntryMenuItem :icon="Trash2" danger @click="actions.handleDeleteFile(state.target)">
          Delete
        </EntryMenuItem>
      </template>

      <!-- Container / blank area menu -->
      <template v-else>
        <EntryMenuItem :icon="Upload" @click="actions.handleUploadFiles(state.targetFolderId)">
          Upload Files
        </EntryMenuItem>
        <EntryMenuItem :icon="FolderPlus" @click="actions.handleUploadFolder(state.targetFolderId)">
          Upload Folder
        </EntryMenuItem>
        <EntryMenuItem
          :icon="Clipboard"
          :disabled="!interactionStore.canPasteInto(state.targetFolderId)"
          @click="actions.handlePaste(state.targetFolderId)"
        >
          Paste
        </EntryMenuItem>
        <div :class="separatorClass" />
        <EntryMenuItem @click="actions.handleCreateFolder(state.targetFolderId)">
          Create Folder
        </EntryMenuItem>
      </template>
    </div>
  </Teleport>
</template>
