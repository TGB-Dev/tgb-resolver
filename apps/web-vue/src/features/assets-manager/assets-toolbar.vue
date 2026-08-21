<script setup lang="ts">
import { Grid, LayoutList } from "@lucide/vue";
import { css } from "@styled-system/css";

import IconButton from "@/features/shared/ui/icon-button.vue";

import { useAssetsManagerStore } from "./assets-manager-store";

const store = useAssetsManagerStore();
</script>

<template>
  <div :class="css({ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', px: '4', py: '2', borderBottomWidth: 1, borderColor: 'border', w: 'full' })">
    <div :class="css({ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '2', fontSize: 'sm' })">
      <div :class="css({ color: 'fg.muted', fontWeight: 'medium' })">Assets</div>
      <div :class="css({ color: 'fg.subtle' })">{{ store.entries.length }} items</div>
    </div>

    <div :class="css({ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1' })">
      <IconButton
        ariaLabel="List view"
        size="sm"
        :variant="store.viewMode === 'list' ? 'solid' : 'ghost'"
        @click="store.setViewMode('list')"
      >
        <LayoutList :size="16" aria-hidden />
      </IconButton>
      <IconButton
        ariaLabel="Grid view"
        size="sm"
        :variant="store.viewMode === 'grid' ? 'solid' : 'ghost'"
        @click="store.setViewMode('grid')"
      >
        <Grid :size="16" aria-hidden />
      </IconButton>
    </div>
  </div>
</template>
