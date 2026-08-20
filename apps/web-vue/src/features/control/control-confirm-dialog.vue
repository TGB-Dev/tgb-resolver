<script setup lang="ts">
import { DialogContent, DialogPositioner, DialogRoot, DialogTitle } from "@ark-ui/vue";
import { Box, VStack } from "@styled-system/jsx";

import UiButton from "@/features/shared/ui/button.vue";
import { useConfirmActionStore } from "@/stores/confirm-action-store";

defineOptions({ name: "ControlConfirmDialog" });
const store = useConfirmActionStore();
</script>
<template>
  <DialogRoot :open="store.open" role="alertdialog" @escape-key-down="store.resolveConfirmAction(false)">
    <DialogPositioner><DialogContent>
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
<style scoped>
[data-part="content"] { background: var(--colors-bg); border: 1px solid var(--colors-border); border-radius: var(--radii-md); }
</style>
