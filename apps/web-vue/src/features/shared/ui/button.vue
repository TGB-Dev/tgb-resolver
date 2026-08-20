<script setup lang="ts">
import { css, cx } from "@styled-system/css";
import { button } from "@styled-system/recipes";
import { computed } from "vue";

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

const classes = computed(() => cx(button({ variant: props.variant, size: props.size }), css({ colorPalette: props.colorPalette, aspectRatio: props.aspectRatio })));
</script>

<template>
  <button
    :type="type"
    :class="classes"
    :disabled="props.disabled || loading"
    :aria-label="ariaLabel"
    v-bind="$attrs"
  >
    <UiSpinner v-if="loading" size="inherit" label="" aria-hidden="true" />
    <slot />
  </button>
</template>
