<script setup lang="ts">
import { css } from "@styled-system/css";
import { ref } from "vue";

const emit = defineEmits<{
  files: [files: File[]];
}>();

const dragging = ref(false);

function receive(event: DragEvent) {
  dragging.value = false;
  const files = [...(event.dataTransfer?.files ?? [])];
  if (files.length) {
    emit("files", files);
  }
}
</script>

<template>
  <button
    type="button"
    :class="css({ display: 'flex', alignItems: 'center', justifyContent: 'center', minH: '8rem', borderWidth: 2, borderStyle: 'dashed', borderColor: 'border', rounded: 'md', color: 'fg.muted', fontSize: 'sm', cursor: 'pointer' })"
    :data-dragging="dragging || undefined"
    @dragover.prevent="dragging = true"
    @dragleave="dragging = false"
    @drop.prevent="receive"
  >
    Drop assets here to upload
  </button>
</template>
