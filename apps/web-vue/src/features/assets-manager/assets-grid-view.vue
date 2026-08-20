<script setup lang="ts">
import { Grid } from "@styled-system/jsx";

import { useAssetsManagerStore } from "./assets-manager-store";

defineOptions({ name: "AssetsGridView" });
const store = useAssetsManagerStore();
</script>
<template><Grid templateColumns="repeat(auto-fill, minmax(10rem, 1fr))" gap="3"><button v-for="entry in store.entries" :key="entry.id" type="button" :data-entry-id="entry.id" @click="store.selectedIds = new Set([entry.id])">{{ entry.name }}</button></Grid></template>
<style scoped>button { min-height: 5rem; border: 1px solid var(--colors-border); background: var(--colors-bg-muted); cursor: pointer; }</style>
