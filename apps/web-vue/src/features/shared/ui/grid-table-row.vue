<script setup lang="ts">
import { css } from "@styled-system/css";

defineProps<{ templateColumns: string }>();
</script>

<template>
  <div
    v-bind="$attrs"
    :class="
      css({
        display: 'grid',
        w: 'full',
        columnGap: '2',
        minH: '8',
        alignItems: 'center',
        '& > *': { alignItems: 'center', position: 'relative', zIndex: 'docked' },
      })
    "
    :style="{ gridTemplateColumns: templateColumns }"
  >
    <slot />
  </div>
</template>
