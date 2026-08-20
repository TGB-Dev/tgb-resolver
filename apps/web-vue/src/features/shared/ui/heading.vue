<script setup lang="ts">
import { Box } from "@styled-system/jsx";
import { heading } from "@styled-system/recipes";
import { computed } from "vue";

defineOptions({ name: "Heading", inheritAttrs: false });

const props = withDefaults(
  defineProps<{ size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" }>(),
  { size: "3xl" },
);

const styles = computed(() => heading.raw({ size: props.size }));
</script>

<template>
  <Box :css="styles" color="colorPalette.fg" v-bind="$attrs">
    <slot />
  </Box>
</template>