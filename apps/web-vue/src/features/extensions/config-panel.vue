<script setup lang="ts">
import { Box, VStack } from "@styled-system/jsx";

import UiButton from "@/features/shared/ui/button.vue";

import { useExtensionRegistry } from "./registry";

defineOptions({ name: "ExtensionConfigPanel" });
const props = defineProps<{ extId?: string; payload?: Record<string, unknown> }>();
const emit = defineEmits<{ save: [payload: Record<string, unknown>]; cancel: [] }>();
const registry = useExtensionRegistry();
</script>
<template><VStack alignItems="stretch" gap="4"><Box>{{ registry.extensionWithExtId(props.extId ?? '')?.description ?? 'Extension configuration' }}</Box><Box display="flex" justifyContent="flex-end" gap="2"><UiButton variant="outline" @click="emit('cancel')">Cancel</UiButton><UiButton @click="emit('save', props.payload ?? {})">Save</UiButton></Box></VStack></template>
