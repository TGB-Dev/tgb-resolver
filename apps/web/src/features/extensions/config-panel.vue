<script setup lang="ts">
import { css } from "@styled-system/css";
import { button } from "@styled-system/recipes";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { CustomEvent } from "@tgb-resolver/realtime";
import { computed, ref, useTemplateRef, watch } from "vue";

import type { FloatingPanelHandle } from "@/features/control/floating-panel-types";
import { useShowStore } from "@/stores/show-store";

import ExtensionConfigForm from "./extension-config-form.vue";
import { computeMediaExtensionDuration } from "./media/duration";
import { patchExtensionEvent } from "./patch";
import { useExtensionRegistry } from "./registry";
import { extensionRendererRegistry } from "./renderers";
import { computeScrollerExtensionDuration } from "./scroller/duration";

const props = defineProps<{ panel: FloatingPanelHandle }>();

const registry = useExtensionRegistry();
const showStore = useShowStore();

const params = computed(() => props.panel.props.value as { eventId?: number });

const event = computed<CustomEvent | null>(() => {
  const eventId = params.value.eventId;
  if (eventId == null) return null;
  const candidate = showStore.showEvents[eventId];
  return candidate?.type === TimelineEventType.CUS ? (candidate as CustomEvent) : null;
});

const extension = computed(() =>
  event.value ? registry.extensionWithExtId(event.value.payload.extId) : undefined,
);
const configForm = computed(() => extension.value?.configForm);
// Restored payload values; the form merges them over definition defaults.
const baseline = computed(() => event.value?.payload.extPayload);

const configFormRef = useTemplateRef<InstanceType<typeof ExtensionConfigForm>>("configFormRef");
const saving = ref(false);
const error = ref<string | null>(null);

const stackCss = css({ display: "flex", flexDirection: "column", gap: 4, h: "full" });
const actionsCss = css({ display: "flex", justifyContent: "flex-end", gap: 2 });
const errorCss = css({ color: "fg.error", fontSize: "sm" });

watch(
  () => configFormRef.value?.isDirty() ?? false,
  (isDirty) => props.panel.setDirty(isDirty),
  { immediate: true },
);

async function handleSubmit(values: Record<string, unknown>) {
  const eventId = params.value.eventId;
  const extId = event.value?.payload.extId;
  if (eventId == null || !extId) {
    props.panel.close(true);
    return;
  }
  saving.value = true;
  error.value = null;
  try {
    const durationSeconds =
      extId === "scroller" ? computeScrollerExtensionDuration(values)
      : extId === "media" ? ((await computeMediaExtensionDuration(values)) ?? undefined)
      : undefined;
    await patchExtensionEvent(eventId, extId, values, durationSeconds);
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
  <div :class="stackCss">
    <ExtensionConfigForm
      v-if="configForm"
      :key="`${params.eventId ?? 0}:${event?.payload.extId ?? ''}`"
      ref="configFormRef"
      :definition="configForm"
      :baseline="baseline"
      :renderers="extensionRendererRegistry"
      :on-submit="handleSubmit"
    />
    <p v-else :class="errorCss">No configuration available for this event.</p>
    <div :class="actionsCss">
      <button type="button" :class="button({ variant: 'outline' })" @click="cancel">
        Cancel
      </button>
      <button
        type="button"
        :class="button()"
        :disabled="!configFormRef?.canSubmit() || !configFormRef?.isDirty() || saving"
        @click="configFormRef?.submit()"
      >
        Save
      </button>
    </div>
    <p v-if="error" :class="errorCss">{{ error }}</p>
  </div>
</template>
