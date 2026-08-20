<script setup lang="ts">
import { Grid } from "@styled-system/jsx";

defineOptions({ name: "GridTableRow", inheritAttrs: false });
</script>

<template>
  <Grid class="_grid-table-row" w="full" gapX="2" minH="8" alignItems="center" v-bind="$attrs">
    <slot />
  </Grid>
</template>

<style scoped>
._grid-table-row > * {
  z-index: 10;
  align-items: center;
}
</style>