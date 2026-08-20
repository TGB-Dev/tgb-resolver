<script setup lang="ts">
import { css } from "@styled-system/css";

defineOptions({ name: "GridTableRow", inheritAttrs: false });
defineProps<{ templateColumns: string }>();
</script>

<template>
  <div
    v-bind="$attrs"
    :class="css({
      display: 'grid',
      w: 'full',
      gap: '2',
      minH: '8',
      alignItems: 'center',
    })"
    :style="{ gridTemplateColumns: templateColumns }"
  >
    <slot />
  </div>
</template>

<style scoped>
div > :deep(*) {
  position: relative;
  z-index: 10;
}
</style>