<script setup lang="ts">
import { Menu } from "@ark-ui/vue";
import { menu } from "@styled-system/recipes";

import EntryMenu from "./entry-menu.vue";
import type { ContextMenuState } from "./use-entry-context-menu";

defineProps<{ state: ContextMenuState }>();
const emit = defineEmits<{ close: [] }>();

const menuClasses = menu();
</script>

<template>
  <Menu.Root
    v-if="state.isOpen"
    :open="true"
    :anchor-point="{ x: state.x, y: state.y }"
    @open-change="(details: { open: boolean }) => { if (!details.open) emit('close') }"
  >
    <Menu.Positioner :class="menuClasses.positioner">
      <Menu.Content :class="menuClasses.content" data-context-menu>
        <EntryMenu :target="state.target" :target-folder-id="state.targetFolderId" />
      </Menu.Content>
    </Menu.Positioner>
  </Menu.Root>
</template>
