<script setup lang="ts">
import { css } from "@styled-system/css";

import Button from "./button.vue";
</script>

<template>
  <Button
    :class="
      css({
        px: 0,
        py: 0,
        _icon: {
          fontSize: '1.2em',
        },
      })
    "
  >
    <slot />
  </Button>
</template>
