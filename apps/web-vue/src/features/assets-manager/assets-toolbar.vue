<script setup lang="ts">
import { Grid, LayoutList } from "@lucide/vue";
import { Box, HStack } from "@styled-system/jsx";

import IconButton from "@/features/shared/ui/icon-button.vue";

import { useAssetsManagerStore } from "./assets-manager-store";

const store = useAssetsManagerStore();
</script>

<template>
  <HStack justify="space-between" px="4" py="2" borderBottomWidth="1" borderColor="border" w="full">
    <HStack gap="2" fontSize="sm">
      <Box color="fg.muted" fontWeight="medium">Assets</Box>
      <Box color="fg.subtle">{{ store.entries.length }} items</Box>
    </HStack>

    <HStack gap="1">
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
    </HStack>
  </HStack>
</template>
