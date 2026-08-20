<script setup lang="ts">
import { Center } from "@styled-system/jsx";
import { ref } from "vue";

defineOptions({ name: "UploadZone" });
const emit = defineEmits<{ files: [files: File[]] }>();
const dragging = ref(false);
function receive(event: DragEvent) { dragging.value = false; const files = [...(event.dataTransfer?.files ?? [])]; if (files.length) emit("files", files); }
</script>
<template><Center minH="8rem" borderWidth="1" borderStyle="dashed" :data-dragging="dragging" @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="receive">Drop assets here</Center></template>
