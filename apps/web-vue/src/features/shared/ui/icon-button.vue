<script setup lang="ts">
import { css, cx } from "@styled-system/css";
import { button } from "@styled-system/recipes";
import { computed } from "vue";

defineOptions({ name: "UiIconButton", inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    variant?: "solid" | "subtle" | "surface" | "outline" | "ghost" | "plain";
    size?: "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
    type?: "button" | "submit" | "reset";
    ariaLabel: string;
    disabled?: boolean;
  }>(),
  { variant: "ghost", size: "md", type: "button" },
);

const classes = computed(() => cx(button({ variant: props.variant, size: props.size }), css({ aspectRatio: "1", p: "0" })));
</script>

<template>
  <button
    :type="type"
    :class="classes"
    :disabled="disabled"
    :aria-label="ariaLabel"
    v-bind="$attrs"
  >
    <slot />
  </button>
</template>
