<script setup lang="ts">
import { Box } from "@styled-system/jsx";
</script>

<template>
  <Box minH="dvh" w="full" px="0">
    <RouterView />
  </Box>
</template>

<style scoped>
:global(html.dark) {
  color-scheme: dark;
}
</style>