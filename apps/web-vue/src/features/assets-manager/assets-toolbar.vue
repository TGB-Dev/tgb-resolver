<script setup lang="ts">
import { Grid, LayoutList } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { button, dataList, iconButton } from "@styled-system/recipes";

import { useAssetsManagerStore } from "./assets-manager-store";

const store = useAssetsManagerStore();
const dataListClasses = dataList({ orientation: "horizontal", size: "sm" });
</script>

<template>
  <div
    :class="
      css({
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: '4',
        py: '2',
        borderBottomWidth: 1,
        borderColor: 'border',
        w: 'full',
      })
    "
  >
    <div :class="dataListClasses.root">
      <div :class="dataListClasses.item">
        <div :class="dataListClasses.itemLabel">Assets</div>
        <div :class="dataListClasses.itemValue">{{ store.entries.length }} items</div>
      </div>
    </div>

    <div :class="css({ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1' })">
      <button
        type="button"
        aria-label="List view"
        :class="
          cx(button({ variant: store.viewMode === 'list' ? 'solid' : 'ghost', size: 'sm' }), iconButton())
        "
        @click="store.setViewMode('list')"
      >
        <LayoutList :size="16" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Grid view"
        :class="
          cx(button({ variant: store.viewMode === 'grid' ? 'solid' : 'ghost', size: 'sm' }), iconButton())
        "
        @click="store.setViewMode('grid')"
      >
        <Grid :size="16" aria-hidden />
      </button>
    </div>
  </div>
</template>
