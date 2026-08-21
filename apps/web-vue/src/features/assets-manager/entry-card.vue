<script setup lang="ts">
import { File, Folder } from "@lucide/vue";
import { css } from "@styled-system/css";
import { computed, ref } from "vue";

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

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5001";
const imgError = ref(false);
const isImage = computed(
  () => !props.entry.isDirectory && props.entry.contentType?.startsWith("image/"),
);

const rootClass = computed(() =>
  css({
    borderWidth: 2,
    borderColor: props.isSelected ? "colorPalette.border" : "border",
    borderRadius: "md",
    overflow: "hidden",
    cursor: "pointer",
    bg: "bg.panel",
    width: "100%",
    display: "block",
    p: 0,
    textAlign: "left",
    fontFamily: "inherit",
    color: "inherit",
    appearance: "none",
    _hover: { shadow: "md" },
  }),
);

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
    :class="rootClass"
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
          height: '32',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bg: 'bg.subtle',
        })
      "
    >
      <Folder v-if="entry.isDirectory" :size="40" aria-hidden />
      <img
        v-else-if="isImage && !imgError"
        :src="`${API_URL}/assets/${entry.id}`"
        :alt="entry.name"
        style="width: 100%; height: 100%; object-fit: contain;"
        @error="imgError = true"
      />
      <File v-else :size="40" aria-hidden />
    </div>
    <div :class="css({ p: 3 })">
      <p :class="css({ fontSize: 'sm', fontWeight: 'medium', wordBreak: 'break-all', margin: 0 })">
        {{ entry.name }}
      </p>
      <p
        v-if="!entry.isDirectory"
        :class="css({ fontSize: 'xs', color: 'fg.muted', mt: 1, margin: 0 })"
      >
        {{ formatSize(entry.sizeBytes ?? 0) }}
      </p>
    </div>
  </button>
</template>
