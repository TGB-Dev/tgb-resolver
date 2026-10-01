<script setup lang="ts">
import { File, Folder } from "@lucide/vue";
import { css, cva } from "@styled-system/css";

import type { FsEntry } from "./types";

const props = defineProps<{
  entry: FsEntry;
  isSelected?: boolean;
}>();

const emit = defineEmits<{
  click: [event: MouseEvent];
  dblclick: [];
  contextmenu: [event: MouseEvent];
  dragstart: [event: DragEvent];
  dragend: [event: DragEvent];
  dragover: [event: DragEvent];
  drop: [event: DragEvent];
}>();

const rootClass = cva({
  base: {
    display: "grid",
    gridTemplateColumns: "1fr 120px 100px",
    gap: 0,
    fontSize: "sm",
    cursor: "pointer",
    w: "full",
    textAlign: "left",
    p: 0,
    appearance: "none",
    fontFamily: "inherit",
    color: "inherit",
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
    bg: { base: "bg.panel", _hover: "bg.subtle" },
  },
  variants: {
    selected: {
      true: {
        borderLeftColor: "colorPalette.border",
        bg: { base: "bg.muted", _hover: "bg.subtle" },
      },
    },
  },
});

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
</script>

<template>
  <button
    type="button"
    :data-entry-id="entry.id"
    draggable="true"
    :class="rootClass({ selected: isSelected })"
    @click.stop="emit('click', $event)"
    @dblclick.stop="emit('dblclick')"
    @contextmenu.stop="emit('contextmenu', $event)"
    @dragstart="emit('dragstart', $event)"
    @dragend="emit('dragend', $event)"
    @dragover="entry.isDirectory ? emit('dragover', $event) : undefined"
    @drop="entry.isDirectory ? emit('drop', $event) : undefined"
  >
    <div
      :class="
        css({
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        })
      "
    >
      <Folder v-if="entry.isDirectory" :size="14" aria-hidden />
      <File v-else :size="14" aria-hidden />
      <span>{{ entry.name }}</span>
    </div>
    <div :class="css({ color: 'fg.muted', fontFamily: 'mono' })">
      {{ entry.isDirectory ? "--" : formatSize(entry.sizeBytes ?? 0) }}
    </div>
    <div
      :class="
        css({
          color: 'fg.muted',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        })
      "
    >
      {{ entry.isDirectory ? "Folder" : entry.contentType }}
    </div>
  </button>
</template>
