<script setup lang="ts">
import { Box, VStack } from "@styled-system/jsx";
import { TgbForm } from "@tgb-form/vue";
import { computed, ref } from "vue";

import Button from "@/features/shared/ui/button.vue";

import { patchExtensionEvent } from "./patch";
import { useExtensionRegistry } from "./registry";
import { extensionRendererRegistry } from "./renderers";
import { computeScrollerExtensionDuration } from "./scroller/duration";
import { createTgbFormInstance } from "./tgb-form-instance";const props = defineProps<{ eventId?: number; extId?: string; payload?: Record<string, unknown> }>();
const emit = defineEmits<{ save: [payload: Record<string, unknown>]; cancel: [] }>();
const registry = useExtensionRegistry();
const extension = computed(() => registry.extensionWithExtId(props.extId ?? ""));
const instance = createTgbFormInstance(props.payload ?? {});
const saving = ref(false);
const error = ref<string | null>(null);
async function save() {
  if (props.eventId == null || !props.extId) {
    emit("save", instance.values);
    return;
  }
  saving.value = true;
  error.value = null;
  try {
    const duration = props.extId === "scroller" ? computeScrollerExtensionDuration(instance.values) : undefined;
    await patchExtensionEvent(props.eventId, props.extId, instance.values, duration);
    emit("save", instance.values);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    saving.value = false;
  }
}
</script>
<template><VStack alignItems="stretch" gap="4"><Box>{{ extension?.description ?? 'Extension configuration' }}</Box><TgbForm v-if="extension?.configForm" :definition="extension.configForm" :instance="instance.values" :renderers="extensionRendererRegistry" /><Box v-if="error" color="fg.error" fontSize="sm">{{ error }}</Box><Box display="flex" justifyContent="flex-end" gap="2"><Button variant="outline" :disabled="saving" @click="emit('cancel')">Cancel</Button><Button :loading="saving" @click="save">Save</Button></Box></VStack></template>
