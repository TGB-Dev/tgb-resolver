<script setup lang="ts">
import { dataList } from "@styled-system/recipes";

defineProps<{
  items: Array<{ label: string; value: string }>;
}>();

const classes = dataList();
</script>

<template>
  <dl :class="classes.root">
    <div v-for="(item, index) in items" :key="index" :class="classes.item">
      <dt :class="classes.itemLabel">{{ item.label }}</dt>
      <dd :class="classes.itemValue">{{ item.value }}</dd>
    </div>
  </dl>
</template>
