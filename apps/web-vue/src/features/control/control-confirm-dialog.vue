<script setup lang="ts">
import { DialogContent, DialogPositioner, DialogRoot, DialogTitle } from "@ark-ui/vue";
import { Box, VStack } from "@styled-system/jsx";
import { dialog } from "@styled-system/recipes";

import UiButton from "@/features/shared/ui/button.vue";
import { useConfirmActionStore } from "@/stores/confirm-action-store";

defineOptions({ name: "ControlConfirmDialog" });
const store = useConfirmActionStore();
const dialogClasses = dialog({ placement: "center", size: "sm" });
</script>
<template>
  <DialogRoot :open="store.open" role="alertdialog" @escape-key-down="store.resolveConfirmAction(false)">
    <DialogPositioner :class="dialogClasses.positioner"><DialogContent :class="dialogClasses.content">
      <VStack alignItems="stretch" gap="4" p="6">
        <DialogTitle>{{ store.title }}</DialogTitle>
        <Box>{{ store.message }}</Box>
        <Box display="flex" justifyContent="flex-end" gap="3">
          <UiButton variant="outline" @click="store.resolveConfirmAction(false)">{{ store.cancelLabel }}</UiButton>
          <UiButton color-palette="red" @click="store.resolveConfirmAction(true)">{{ store.confirmLabel }}</UiButton>
        </Box>
      </VStack>
    </DialogContent></DialogPositioner>
  </DialogRoot>
</template>
