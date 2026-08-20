<script setup lang="ts">
import { Grid } from "@styled-system/jsx";
import { button } from "@styled-system/recipes";

import { useAssetsManagerStore } from "./assets-manager-store";

defineOptions({ name: "AssetsGridView" });
const store = useAssetsManagerStore();
</script>
<template><Grid templateColumns="repeat(auto-fill, minmax(10rem, 1fr))" gap="3"><button v-for="(entry, index) in store.entries" :key="entry.id" type="button" :class="button({ variant: 'outline', size: 'lg' })" :data-entry-id="entry.id" @click="store.handleEntryClick($event, index)" @dblclick="entry.isDirectory && store.selectEntry(entry.id)">{{ entry.name }}</button></Grid></template>
