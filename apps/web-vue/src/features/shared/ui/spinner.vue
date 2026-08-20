<script setup lang="ts">
import { spinner } from "@styled-system/recipes";
import { computed } from "vue";

defineOptions({ name: "UiSpinner" });

const props = withDefaults(
  defineProps<{
    size?: "inherit" | "xs" | "sm" | "md" | "lg" | "xl";
    label?: string;
  }>(),
  { size: "md", label: "Loading" },
);

const classes = computed(() => spinner({ size: props.size }));
</script>

<template>
  <span
    :class="classes"
    role="status"
    :aria-label="label"
    aria-live="polite"
    v-bind="$attrs"
  />
</template>
