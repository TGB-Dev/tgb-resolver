<script setup lang="ts">
import { VStack } from "@styled-system/jsx";

import { useAssetsManagerStore } from "./assets-manager-store";

defineOptions({ name: "AssetsListView" });
const store = useAssetsManagerStore();
</script>
<template><VStack alignItems="stretch"><button v-for="entry in store.entries" :key="entry.id" type="button" :data-entry-id="entry.id" @click="store.selectedIds = new Set([entry.id])">{{ entry.name }}</button></VStack></template>
<style scoped>button { border: 0; border-bottom: 1px solid var(--colors-border); background: transparent; padding: .5rem; text-align: start; cursor: pointer; }</style>
