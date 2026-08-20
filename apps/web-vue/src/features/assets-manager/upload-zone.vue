<script setup lang="ts">
import { Center } from "@styled-system/jsx";
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
  <Center
    minH="8rem"
    borderWidth="2"
    borderStyle="dashed"
    borderColor="border"
    rounded="md"
    color="fg.muted"
    fontSize="sm"
    :data-dragging="dragging || undefined"
    @dragover.prevent="dragging = true"
    @dragleave="dragging = false"
    @drop.prevent="receive"
  >
    Drop assets here to upload
  </Center>
</template>
