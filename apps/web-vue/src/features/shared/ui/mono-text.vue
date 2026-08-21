<script setup lang="ts">
import { css } from "@styled-system/css";

const styles = css({
  fontFamily: "mono",
  fontVariantNumeric: "tabular-nums",
  fontSmoothing: "subpixel-antialiased",
  mx: 1,
});
</script>

<template>
  <span :class="styles">
    <slot />
  </span>
</template>
