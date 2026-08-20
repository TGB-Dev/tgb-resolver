<script setup lang="ts">
import { File, Folder } from "@lucide/vue";
import { Box } from "@styled-system/jsx";
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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
</script>

<template>
  <Box
    :data-entry-id="entry.id"
    draggable="true"
    borderWidth="2"
    :borderColor="isSelected ? 'colorPalette.border' : 'border'"
    rounded="md"
    overflow="hidden"
    cursor="pointer"
    :_hover="{ shadow: 'md' }"
    bg="bg.panel"
    @click.stop="emit('click', $event)"
    @dblclick.stop="emit('dblclick')"
    @contextmenu.stop="emit('contextmenu', $event)"
    @dragstart="emit('dragstart', $event)"
    @dragend="emit('dragend', $event)"
    @dragover="entry.isDirectory ? emit('dragover', $event) : undefined"
    @drop="entry.isDirectory ? emit('drop', $event) : undefined"
  >
    <Box h="32" display="flex" alignItems="center" justifyContent="center" bg="bg.subtle">
      <Folder v-if="entry.isDirectory" :size="40" aria-hidden />
      <img
        v-else-if="isImage && !imgError"
        :src="`${API_URL}/assets/${entry.id}`"
        :alt="entry.name"
        style="width: 100%; height: 100%; object-fit: contain;"
        @error="imgError = true"
      />
      <File v-else :size="40" aria-hidden />
    </Box>
    <Box p="3">
      <Box fontSize="sm" fontWeight="medium" wordBreak="break-all">
        {{ entry.name }}
      </Box>
      <Box v-if="!entry.isDirectory" fontSize="xs" color="fg.muted" mt="1">
        {{ formatSize(entry.sizeBytes ?? 0) }}
      </Box>
    </Box>
  </Box>
</template>
