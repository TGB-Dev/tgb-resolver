<script setup lang="ts">
import {
  DialogBackdrop,
  DialogContent,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
} from "@ark-ui/vue";
import { css } from "@styled-system/css";
import { dialog, field, input } from "@styled-system/recipes";
import { nextTick, ref, watch } from "vue";

import Button from "@/features/shared/ui/button.vue";
import { useConfirmActionStore } from "@/stores/confirm-action-store";

const store = useConfirmActionStore();
const dialogClasses = dialog({ placement: "center", size: "sm" });
const fieldClasses = field();
const inputClasses = input({ size: "md" });

const content = css({ display: "flex", flexDirection: "column", gap: "4", alignItems: "stretch", padding: "6" });
const message = css({ color: "fg.muted", fontSize: "sm" });
const actions = css({ display: "flex", justifyContent: "flex-end", gap: "3" });

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
        <div :class="content">
          <DialogTitle :class="dialogClasses.title">{{ store.title }}</DialogTitle>

          <div v-if="store.showInput" :class="fieldClasses.root">
            <label for="control-dialog-input" :class="fieldClasses.label">{{ store.inputLabel || store.message }}</label>
            <input
              id="control-dialog-input"
              ref="inputRef"
              :class="inputClasses"
              :value="store.inputValue"
              @input="(e: Event) => store.setInputValue((e.target as HTMLInputElement).value)"
              @keydown.enter="store.resolveConfirmAction(true)"
            />
          </div>
          <p v-else :class="message">{{ store.message }}</p>

          <div :class="actions">
            <Button variant="outline" @click="store.resolveConfirmAction(false)">
              {{ store.cancelLabel }}
            </Button>
            <Button
              :colorPalette="store.showInput ? 'blue' : 'red'"
              @click="store.resolveConfirmAction(true)"
            >
              {{ store.confirmLabel }}
            </Button>
          </div>
        </div>
      </DialogContent>
    </DialogPositioner>
  </DialogRoot>
</template>
