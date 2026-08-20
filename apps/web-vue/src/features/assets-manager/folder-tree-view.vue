<script setup lang="ts">
import { Folder, FolderOpen } from "@lucide/vue";
import { VStack } from "@styled-system/jsx";

import { useAssetsManagerStore } from "./assets-manager-store";

defineOptions({ name: "FolderTreeView" });
const store = useAssetsManagerStore();
</script>
<template><VStack alignItems="stretch"><button v-for="folder in store.folderTree" :key="folder.id" type="button" @click="store.selectEntry(folder.id)"><FolderOpen v-if="store.expandedFolderIds.has(folder.id)" :size="16" /><Folder v-else :size="16" />{{ folder.name }}</button></VStack></template>
<style scoped>button { display: flex; align-items: center; gap: .5rem; border: 0; background: transparent; cursor: pointer; text-align: start; }</style>
