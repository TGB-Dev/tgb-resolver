<script setup lang="ts">
import { VStack } from "@styled-system/jsx";
import { ref } from "vue";

import UiButton from "@/features/shared/ui/button.vue";

defineOptions({ name: "ImportShowPanel" });
const emit = defineEmits<{ import: [file: File]; cancel: [] }>();
const file = ref<File | null>(null);
</script>
<template><VStack alignItems="stretch" gap="3"><input type="file" accept=".json,.xml" @change="file = ($event.target as HTMLInputElement).files?.[0] ?? null" /><UiButton :disabled="file === null" @click="file && emit('import', file)">Import</UiButton><UiButton variant="outline" @click="emit('cancel')">Cancel</UiButton></VStack></template>
