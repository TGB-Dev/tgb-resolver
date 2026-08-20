<script setup lang="ts">
import { HStack } from "@styled-system/jsx";

import UiButton from "@/features/shared/ui/button.vue";

import { useAssetsManagerStore } from "./assets-manager-store";

defineOptions({ name: "AssetsToolbar" });
const store = useAssetsManagerStore();
</script>
<template><HStack gap="2"><UiButton size="sm" :variant="store.viewMode === 'grid' ? 'solid' : 'outline'" @click="store.setViewMode('grid')">Grid</UiButton><UiButton size="sm" :variant="store.viewMode === 'list' ? 'solid' : 'outline'" @click="store.setViewMode('list')">List</UiButton><UiButton size="sm" variant="ghost" @click="store.expandAll">Expand all</UiButton><UiButton size="sm" variant="ghost" @click="store.collapseAll">Collapse all</UiButton></HStack></template>
