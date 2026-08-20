<script setup lang="ts">
import { Box, VStack } from "@styled-system/jsx";
import { TgbForm } from "@tgb-form/vue";
import { computed } from "vue";

import UiButton from "@/features/shared/ui/button.vue";

import { useExtensionRegistry } from "./registry";
import { extensionRendererRegistry } from "./renderers";
import { createTgbFormInstance } from "./tgb-form-instance";

defineOptions({ name: "ExtensionConfigPanel" });
const props = defineProps<{ extId?: string; payload?: Record<string, unknown> }>();
const emit = defineEmits<{ save: [payload: Record<string, unknown>]; cancel: [] }>();
const registry = useExtensionRegistry();
const extension = computed(() => registry.extensionWithExtId(props.extId ?? ""));
const instance = createTgbFormInstance(props.payload ?? {});
</script>
<template><VStack alignItems="stretch" gap="4"><Box>{{ extension?.description ?? 'Extension configuration' }}</Box><TgbForm v-if="extension?.configForm" :definition="extension.configForm" :instance="instance.values" :renderers="extensionRendererRegistry" /><Box display="flex" justifyContent="flex-end" gap="2"><UiButton variant="outline" @click="emit('cancel')">Cancel</UiButton><UiButton @click="emit('save', instance.values)">Save</UiButton></Box></VStack></template>
