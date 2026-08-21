<script setup lang="ts">
import { css, cx } from "@styled-system/css";
import { heading } from "@styled-system/recipes";

const props = withDefaults(
  defineProps<
    { as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"; size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" }
  >(),
  { as: "h2", size: "3xl" },
);

const styles = cx(
  heading({ size: props.size }),
  css({
    color: "colorPalette.fg",
    fontWeight: 700,
    lineHeight: 1.2,
    marginBlock: 0,
  }),
);
</script>

<template>
  <component :is="props.as" :class="styles" v-bind="$attrs">
    <slot />
  </component>
</template>
