<script setup lang="ts">
import { Folder, FolderOpen } from "@lucide/vue";
import { HStack, VStack } from "@styled-system/jsx";

import { useAssetsManagerStore } from "./assets-manager-store";

defineOptions({ name: "FolderTreeView" });

const store = useAssetsManagerStore();
</script>

<template>
  <VStack alignItems="stretch" gap="1" p="2">
    <HStack
      v-for="folder in store.folderTree"
      :key="folder.id"
      gap="2"
      px="2"
      py="1.5"
      rounded="md"
      cursor="pointer"
      :bg="store.selectedEntryId === folder.id ? 'bg.muted' : 'transparent'"
      :_hover="{ bg: 'bg.subtle' }"
      @click="store.selectEntry(folder.id)"
    >
      <FolderOpen v-if="store.expandedFolderIds.has(folder.id)" :size="16" aria-hidden />
      <Folder v-else :size="16" aria-hidden />
      <span>{{ folder.name }}</span>
    </HStack>
  </VStack>
</template>
