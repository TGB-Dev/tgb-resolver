<script setup lang="ts">
import { css, cva, cx } from "@styled-system/css";
import { button } from "@styled-system/recipes";
import type { Component } from "vue";

withDefaults(
  defineProps<{
    icon?: Component;
    danger?: boolean;
    disabled?: boolean;
  }>(),
  { icon: undefined, danger: false, disabled: false },
);

// Chakra MenuItemButton equivalent: ghost sm button stretched across the menu.
const itemClass = cx(
  button({ variant: "ghost", size: "sm" }),
  css({
    w: "full",
    justifyContent: "flex-start",
    fontWeight: "normal",
    px: "3",
    borderRadius: "none",
  }),
);
const stateClass = cva({
  base: {},
  variants: {
    danger: {
      true: {
        color: { base: "fg.error", _hover: "fg.error" },
        bg: { _hover: "bg.error" },
      },
    },
    disabled: { true: { opacity: 0.5, cursor: "not-allowed" } },
  },
});
</script>

<template>
  <button
    type="button"
    :class="cx(itemClass, stateClass({ danger: danger, disabled: disabled }))"
    :disabled="disabled"
  >
    <component :is="icon" v-if="icon" :size="16" aria-hidden />
    <slot />
  </button>
</template>
