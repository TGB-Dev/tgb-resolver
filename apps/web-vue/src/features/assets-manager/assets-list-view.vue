<script setup lang="ts">
import { VStack } from "@styled-system/jsx";
import { button } from "@styled-system/recipes";

import { useAssetsManagerStore } from "./assets-manager-store";

defineOptions({ name: "AssetsListView" });
const store = useAssetsManagerStore();
</script>
<template><VStack alignItems="stretch"><button v-for="entry in store.entries" :key="entry.id" type="button" :class="button({ variant: 'plain', size: 'sm' })" :data-entry-id="entry.id" @click="store.selectedIds = new Set([entry.id])">{{ entry.name }}</button></VStack></template>
