<script setup lang="ts">
import { css, cx } from "@styled-system/css";
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
const dangerItemClass = css({ color: "fg.error", _hover: { bg: "bg.error", color: "fg.error" } });
</script>

<template>
  <button
    type="button"
    :class="[itemClass, danger ? dangerItemClass : '', disabled ? css({ opacity: 0.5, cursor: 'not-allowed' }) : '']"
    :disabled="disabled"
  >
    <component :is="icon" v-if="icon" :size="16" aria-hidden />
    <slot />
  </button>
</template>
