<script setup lang="ts">
import { Grid, VStack } from "@styled-system/jsx";

import { useAssetsManagerStore } from "./assets-manager-store";

defineOptions({ name: "AssetsManager" });
const store = useAssetsManagerStore();
</script>
<template><Grid h="full" templateColumns="12rem 1fr" gap="4" p="4"><VStack alignItems="stretch"><button v-for="folder in store.folderTree" :key="folder.id" type="button" @click="store.selectEntry(folder.id)">{{ folder.name }}</button></VStack><VStack alignItems="stretch"><span v-for="entry in store.entries" :key="entry.id">{{ entry.name }}</span><span v-if="store.entries.length === 0">No assets</span></VStack></Grid></template>
<style scoped>button { cursor: pointer; text-align: start; }</style>
