<script setup lang="ts">
import { Splitter } from "@ark-ui/vue";
import { css, cx } from "@styled-system/css";
import { splitter } from "@styled-system/recipes";
import { whenever } from "@vueuse/core";
import { onMounted, useTemplateRef } from "vue";

import { useControlShowQuery } from "@/features/control/composables/use-show";

import AssetsGridView from "./assets-grid-view.vue";
import AssetsListView from "./assets-list-view.vue";
import { useAssetsManagerStore } from "./assets-manager-store";
import AssetsToolbar from "./assets-toolbar.vue";
import FolderTreeView from "./folder-tree-view.vue";
import UploadZone from "./upload-zone.vue";

const store = useAssetsManagerStore();
const showQuery = useControlShowQuery();
const splitterClasses = splitter();
const fileInputRef = useTemplateRef<HTMLInputElement>("fileInputRef");

onMounted(() => {
  store.fileInputEl = fileInputRef.value;
});

// Data-sync, not side-effect-on-every-dep: run once with cached data
// (immediate) and again on every query update.
whenever(showQuery.data, (data) => store.applyShowState(data), { immediate: true });

function handleFileInputChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const files = target.files;
  const folderId = store.selectedEntryId;
  if (files) {
    for (const file of files) {
      store.uploadAsset(folderId, file).catch(console.error);
    }
  }
  target.value = "";
}
</script>

<template>
  <div :class="css({ flex: 1, minH: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' })">
    <Splitter.Root
      :class="cx(splitterClasses.root, css({ flex: 1, minH: '0', overflow: 'hidden' }))"
      orientation="horizontal"
      :defaultSize="[25, 75]"
      :panels="[{ id: 'tree', minSize: 15 }, { id: 'content', minSize: 40 }]"
    >
      <Splitter.Panel
        id="tree"
        :minSize="15"
        :class="cx(splitterClasses.panel, css({ overflow: 'hidden', display: 'flex', flexDirection: 'column', minH: '0' }))"
      >
        <FolderTreeView />
      </Splitter.Panel>

      <Splitter.ResizeTrigger id="tree:content" :class="splitterClasses.resizeTrigger" />

      <Splitter.Panel
        id="content"
        :minSize="40"
        :class="cx(splitterClasses.panel, css({ overflow: 'hidden', display: 'flex', flexDirection: 'column', minH: '0' }))"
      >
        <div
          :class="
            css({
              display: 'flex',
              flexDirection: 'column',
              minH: '0',
              overflow: 'hidden',
              flex: 1,
            })
          "
        >
          <AssetsToolbar />
          <UploadZone :class="css({ flex: 1, minH: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' })">
            <AssetsListView v-if="store.viewMode === 'list'" />
            <AssetsGridView v-else />
          </UploadZone>
        </div>
      </Splitter.Panel>
    </Splitter.Root>

    <input
      ref="fileInputRef"
      type="file"
      multiple
      hidden
      @change="handleFileInputChange"
    />
  </div>
</template>
