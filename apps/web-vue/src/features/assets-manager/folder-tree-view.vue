<script setup lang="ts">
import { Folder, FolderOpen } from "@lucide/vue";
import { HStack, VStack } from "@styled-system/jsx";

import { useAssetsManagerStore } from "./assets-manager-store";

defineOptions({ name: "FolderTreeView" });
const store = useAssetsManagerStore();
</script>
<template><VStack alignItems="stretch"><HStack v-for="folder in store.folderTree" :key="folder.id" asChild gap="2"><button type="button" @click="store.selectEntry(folder.id)"><FolderOpen v-if="store.expandedFolderIds.has(folder.id)" :size="16" /><Folder v-else :size="16" />{{ folder.name }}</button></HStack></VStack></template>
