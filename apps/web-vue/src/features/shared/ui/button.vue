<script setup lang="ts">
import { css } from "@styled-system/css";
import { button } from "@styled-system/recipes";
import { type CSSProperties, computed } from "vue";

import UiSpinner from "./spinner.vue";

defineOptions({ name: "UiButton", inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    variant?: "solid" | "subtle" | "surface" | "outline" | "ghost" | "plain";
    size?: "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
    colorPalette?: "blue" | "red" | string;
    loading?: boolean;
    type?: "button" | "submit" | "reset";
    aspectRatio?: string;
    ariaLabel?: string;
    disabled?: boolean;
  }>(),
  { variant: "solid", size: "md", type: "button" },
);

const classes = computed(() => button({ variant: props.variant, size: props.size }));
const style = computed<CSSProperties & Record<string, string>>(() => {
  const result: CSSProperties & Record<string, string> = {};
  if (props.colorPalette) result["--colors-color-palette"] = props.colorPalette;
  if (props.aspectRatio) result.aspectRatio = props.aspectRatio;
  return result;
});
</script>

<template>
  <button
    :type="type"
    :class="classes"
    :style="style"
    :disabled="props.disabled || loading"
    :aria-label="ariaLabel"
    v-bind="$attrs"
    class="tgb-button"
  >
    <UiSpinner v-if="loading" size="inherit" label="" aria-hidden="true" />
    <slot />
  </button>
</template>

<style scoped>
.tgb-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  cursor: pointer;
}

.tgb-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

</style>
