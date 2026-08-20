<script setup lang="ts">
import {
  DialogBackdrop,
  DialogContent,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
} from "@ark-ui/vue";
import { Box, VStack } from "@styled-system/jsx";
import { dialog, field, input } from "@styled-system/recipes";
import { nextTick, ref, watch } from "vue";

import UiButton from "@/features/shared/ui/button.vue";
import { useConfirmActionStore } from "@/stores/confirm-action-store";

defineOptions({ name: "ControlConfirmDialog" });

const store = useConfirmActionStore();
const dialogClasses = dialog({ placement: "center", size: "sm" });
const fieldClasses = field();
const inputClasses = input({ size: "md" });

const inputRef = ref<HTMLInputElement | null>(null);

watch(
  () => [store.open, store.showInput],
  ([isOpen, isShowInput]) => {
    if (isOpen && isShowInput) {
      nextTick(() => {
        inputRef.value?.focus();
        inputRef.value?.select();
      });
    }
  },
);
</script>

<template>
  <DialogRoot
    :open="store.open"
    role="alertdialog"
    @escape-key-down="store.resolveConfirmAction(false)"
    @pointer-down-outside="store.resolveConfirmAction(false)"
  >
    <DialogBackdrop :class="dialogClasses.backdrop" />
    <DialogPositioner :class="dialogClasses.positioner">
      <DialogContent :class="dialogClasses.content">
        <VStack alignItems="stretch" gap="4" p="6">
          <DialogTitle :class="dialogClasses.title">{{ store.title }}</DialogTitle>

          <Box v-if="store.showInput" :class="fieldClasses.root">
            <label for="control-dialog-input" :class="fieldClasses.label">{{ store.inputLabel || store.message }}</label>
            <input
              id="control-dialog-input"
              ref="inputRef"
              :class="inputClasses"
              :value="store.inputValue"
              @input="(e) => store.setInputValue((e.target as HTMLInputElement).value)"
              @keydown.enter="store.resolveConfirmAction(true)"
            />
          </Box>
          <Box v-else color="fg.muted" fontSize="sm">{{ store.message }}</Box>

          <Box display="flex" justifyContent="flex-end" gap="3">
            <UiButton variant="outline" @click="store.resolveConfirmAction(false)">
              {{ store.cancelLabel }}
            </UiButton>
            <UiButton
              :colorPalette="store.showInput ? 'blue' : 'red'"
              @click="store.resolveConfirmAction(true)"
            >
              {{ store.confirmLabel }}
            </UiButton>
          </Box>
        </VStack>
      </DialogContent>
    </DialogPositioner>
  </DialogRoot>
</template>
