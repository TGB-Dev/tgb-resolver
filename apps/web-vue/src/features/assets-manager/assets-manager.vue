<script setup lang="ts">
import { Grid, VStack } from "@styled-system/jsx";
import { watchEffect } from "vue";

import { useControlShowQuery } from "@/features/control/composables/use-show";

import AssetsGridView from "./assets-grid-view.vue";
import AssetsListView from "./assets-list-view.vue";
import { useAssetsManagerStore } from "./assets-manager-store";
import AssetsToolbar from "./assets-toolbar.vue";
import FolderTreeView from "./folder-tree-view.vue";
import UploadZone from "./upload-zone.vue";

defineOptions({ name: "AssetsManager" });

const store = useAssetsManagerStore();
const showQuery = useControlShowQuery();

watchEffect(() => {
  if (showQuery.data.value) {
    store.applyShowState(showQuery.data.value);
  }
});
</script>

<template>
  <Grid h="full" templateColumns="12rem 1fr" gap="4" p="4">
    <VStack alignItems="stretch" borderRightWidth="1" borderColor="border" pr="2">
      <FolderTreeView />
    </VStack>
    <VStack alignItems="stretch" gap="2">
      <AssetsToolbar />
      <AssetsGridView v-if="store.viewMode === 'grid'" />
      <AssetsListView v-else />
      <UploadZone />
    </VStack>
  </Grid>
</template>
