<script setup lang="ts">
import { Box } from "@styled-system/jsx";
import { heading } from "@styled-system/recipes";

defineOptions({ name: "Heading", inheritAttrs: false });

const defaultStyles = heading.raw({ size: "3xl" });
</script>

<template>
  <Box :css="defaultStyles" color="colorPalette.fg" v-bind="$attrs">
    <slot />
  </Box>
</template>