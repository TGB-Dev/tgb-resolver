<script setup lang="ts">
import { css } from "@styled-system/css";
import type { BaseVueRendererProps } from "@tgb-form/vue";

defineProps<BaseVueRendererProps>();

const text = css({ color: "fg.muted", fontSize: "sm" });
</script>

<template>
  <p :class="text">{{ label }}: nested Object/Array fields are not yet editable.</p>
</template>
