<script setup lang="ts">
import { Grid, LayoutList } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { button, dataList, iconButton } from "@styled-system/recipes";

import { useAssetsManagerStore } from "./assets-manager-store";
import { ViewMode } from "./types";

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
        position: 'sticky',
        top: '0',
        zIndex: 1,
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
          cx(button({ variant: store.viewMode === ViewMode.List ? 'solid' : 'ghost', size: 'sm' }), iconButton())
        "
        @click="store.setViewMode(ViewMode.List)"
      >
        <LayoutList :size="16" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Grid view"
        :class="
          cx(button({ variant: store.viewMode === ViewMode.Grid ? 'solid' : 'ghost', size: 'sm' }), iconButton())
        "
        @click="store.setViewMode(ViewMode.Grid)"
      >
        <Grid :size="16" aria-hidden />
      </button>
    </div>
  </div>
</template>
