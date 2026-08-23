<script setup lang="ts">
import { Field } from "@ark-ui/vue";
import { FileUp } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { field as fieldRecipe, input } from "@styled-system/recipes";
import type { BaseVueRendererProps } from "@tgb-form/vue";
import { computed, ref } from "vue";

import { useAssetsManagerStore } from "@/features/assets-manager/assets-manager-store";

import { fieldErrorTextCss, validationErrorMessage } from "./field-error";
import { getDroppedAssetId } from "./get-dropped-asset-id";

const props = defineProps<BaseVueRendererProps>();

const assets = useAssetsManagerStore();
const isDragOver = ref(false);

const fieldClasses = fieldRecipe();

const currentValue = computed(() =>
  typeof props.field.state.value === "string" ? props.field.state.value : "",
);

const placeholder = computed(() =>
  typeof props.props?.placeholder === "string"
    ? props.props.placeholder
    : "Drop asset here or enter Asset ID...",
);

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
  <Field.Root :class="cx(fieldClasses.root, css({ w: 'full' }))" :invalid="errors.length > 0">
    <Field.Label v-if="label" :class="fieldClasses.label">{{ label }}</Field.Label>
    <!-- biome-ignore lint/a11y/noStaticElementInteractions: pointer-only drop target; the inner input is the accessible path -->
    <div
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
      <div :class="css({ display: 'flex', alignItems: 'center', gap: 3 })">
        <FileUp :size="20" aria-hidden />
        <div :class="css({ flex: 1 })">
          <input
            :class="cx(input({ size: 'sm' }), css({ w: 'full', bg: 'bg' }))"
            :value="currentValue"
            :placeholder="placeholder"
            @input="field.handleChange(($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
      <p :class="css({ fontSize: 'xs', color: 'fg.muted', mt: 1 })">
        Drag &amp; drop an asset from Asset Manager into this box
      </p>
    </div>
    <p v-if="description" :class="fieldClasses.helperText">{{ description }}</p>
    <p v-if="errors.length > 0" :class="cx(fieldClasses.errorText, fieldErrorTextCss)">
      {{ errors.map(validationErrorMessage).join(', ') }}
    </p>
  </Field.Root>
</template>
