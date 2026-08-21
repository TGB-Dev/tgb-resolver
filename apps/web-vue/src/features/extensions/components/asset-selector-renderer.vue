<script setup lang="ts">
import { FileUp } from "@lucide/vue";
import { css } from "@styled-system/css";
import type { VueRendererProps } from "@tgb-form/vue";
import { computed, ref } from "vue";

import { useAssetsManagerStore } from "@/features/assets-manager/assets-manager-store";

import { getDroppedAssetId } from "./get-dropped-asset-id";

const props = defineProps<VueRendererProps>();

const assets = useAssetsManagerStore();
const isDragOver = ref(false);

const currentValue = computed(() =>
  typeof props.field.state.value === "string" ? props.field.state.value : "",
);

const placeholder = computed(() =>
  typeof props.props?.placeholder === "string"
    ? props.props.placeholder
    : "Drop asset here or enter Asset ID...",
);

function validationErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const { message } = error as { message?: unknown };
    if (typeof message === "string") return message;
  }
  return String(error);
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  isDragOver.value = false;
  const dt = event.dataTransfer;
  if (!dt) return;

  const droppedId = getDroppedAssetId(dt, (id) => {
    const entry = assets.findEntry(id);
    return entry !== undefined && !entry.isDirectory;
  });

  if (droppedId) {
    props.field.handleChange(droppedId);
  }
}
</script>

<template>
  <div :class="css({ w: 'full', display: 'flex', flexDirection: 'column', gap: 1 })">
    <label v-if="label" :class="css({ fontSize: 'sm', fontWeight: 'medium' })" for="asset-selector">{{ label }}</label>
    <button
      id="asset-selector"
      aria-label="Drop files to upload"
      type="button"
      :class="
        css({
          w: 'full',
          p: 3,
          borderRadius: 'md',
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: isDragOver ? 'border.emphasized' : 'border',
          bg: isDragOver ? 'bg.emphasized' : 'bg.subtle',
          transition: 'all 0.15s ease',
        })
      "
      @dragover.prevent="isDragOver = true"
      @dragleave="isDragOver = false"
      @drop="handleDrop"
    >
      <div :class="css({ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 3 })">
        <FileUp :size="20" aria-hidden />
        <input
          :class="
            css({
              flex: 1,
              w: 'full',
              fontSize: 'sm',
              px: 2,
              py: 1,
              borderWidth: 1,
              borderColor: 'border',
              borderRadius: 'sm',
              bg: 'bg',
            })
          "
          :value="currentValue"
          :placeholder="placeholder"
          @input="field.handleChange(($event.target as HTMLInputElement).value)"
        />
      </div>
      <p :class="css({ fontSize: 'xs', color: 'fg.muted', mt: 1 })">
        Drag & drop an asset from Asset Manager into this box
      </p>
    </button>
    <p v-if="description" :class="css({ fontSize: 'xs', color: 'fg.muted' })">{{ description }}</p>
    <p v-if="errors.length > 0" :class="css({ color: 'fg.error', fontSize: 'sm' })">
      {{ errors.map(validationErrorMessage).join(", ") }}
    </p>
  </div>
</template>
