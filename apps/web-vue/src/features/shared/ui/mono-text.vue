<script setup lang="ts">
import { css } from "@styled-system/css";
import type { HTMLAttributes } from "vue";

defineProps<HTMLAttributes>();

const styles = css({
  fontFamily: "mono",
  fontVariantNumeric: "tabular-nums",
  WebkitFontSmoothing: "auto",
  MozOsxFontSmoothing: "auto",
});
</script>

<template>
  <span :class="styles" v-bind="$attrs">
    <slot />
  </span>
</template>
