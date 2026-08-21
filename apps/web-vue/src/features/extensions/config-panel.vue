<script setup lang="ts">
import { css } from "@styled-system/css";
import { TgbForm } from "@tgb-form/vue";
import { computed, ref, watch } from "vue";

import type { FloatingPanelHandle } from "@/features/control/floating-panel-types";
import Button from "@/features/shared/ui/button.vue";

import { patchExtensionEvent } from "./patch";
import { useExtensionRegistry } from "./registry";
import { extensionRendererRegistry } from "./renderers";
import { computeScrollerExtensionDuration } from "./scroller/duration";
import { createTgbFormInstance } from "./tgb-form-instance";

const props = defineProps<{ panel: FloatingPanelHandle }>();

const registry = useExtensionRegistry();

const params = computed(
  () =>
    props.panel.props.value as {
      eventId?: number;
      extId?: string;
      payload?: Record<string, unknown>;
    },
);

const extension = computed(() => registry.extensionWithExtId(params.value.extId ?? ""));
const baseline = computed(() => params.value.payload ?? {});
const instance = createTgbFormInstance(baseline.value);
const saving = ref(false);
const error = ref<string | null>(null);

watch(
  () => JSON.stringify(instance.values),
  (current, previous) => {
    if (previous === undefined) return;
    props.panel.setDirty(current !== JSON.stringify(baseline.value));
  },
  { immediate: true },
);

async function save() {
  const eventId = params.value.eventId;
  const extId = params.value.extId;
  if (eventId == null || !extId) {
    props.panel.close(true);
    return;
  }
  saving.value = true;
  error.value = null;
  try {
    const duration =
      extId === "scroller" ? computeScrollerExtensionDuration(instance.values) : undefined;
    await patchExtensionEvent(eventId, extId, instance.values, duration);
    props.panel.close(true);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    saving.value = false;
  }
}

function cancel() {
  void props.panel.requestClose();
}
</script>

<template>
  <div :class="css({ display: 'flex', flexDirection: 'column', gap: 4, height: 'full' })">
    <p :class="css({ color: 'fg.muted', fontSize: 'sm' })">
      {{ extension?.description ?? 'Extension configuration' }}
    </p>
    <TgbForm
      v-if="extension?.configForm"
      :definition="extension.configForm"
      :instance="instance.values"
      :renderers="extensionRendererRegistry"
    />
    <p v-if="error" :class="css({ color: 'fg.error', fontSize: 'sm' })">{{ error }}</p>
    <div :class="css({ display: 'flex', justifyContent: 'flex-end', gap: 2 })">
      <Button variant="outline" :disabled="saving" @click="cancel">Cancel</Button>
      <Button :loading="saving" @click="save">Save</Button>
    </div>
  </div>
</template>
