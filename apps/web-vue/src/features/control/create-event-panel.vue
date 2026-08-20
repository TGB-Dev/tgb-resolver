<script setup lang="ts">
import { VStack } from "@styled-system/jsx";

import UiButton from "@/features/shared/ui/button.vue";

defineOptions({ name: "CreateEventPanel" });
const emit = defineEmits<{ create: [payload: Record<string, unknown>]; cancel: [] }>();
</script>
<template><VStack alignItems="stretch" gap="3"><h2>Create event</h2><UiButton @click="emit('create', {})">Create</UiButton><UiButton variant="outline" @click="emit('cancel')">Cancel</UiButton></VStack></template>
