<script setup lang="ts">
import { Dialog } from "@ark-ui/vue";
import { css, cx } from "@styled-system/css";
import { button, dialog, field, input } from "@styled-system/recipes";
import { nextTick, useTemplateRef, watch } from "vue";

import { useConfirmActionStore } from "@/stores/confirm-action-store";

const store = useConfirmActionStore();
const dialogClasses = dialog({ placement: "center", size: "sm" });
const fieldClasses = field();
const inputClasses = input({ size: "md" });

// Above floating panels (popover 1500), below toasts (1700): the unsaved-changes
// prompt must win over panels when closing a dirty floating panel.
const topLayer = css({ zIndex: 1600 });
const content = css({ display: "flex", flexDirection: "column", gap: "4", alignItems: "stretch", padding: "6" });
const message = css({ color: "fg.muted", fontSize: "sm" });
const actions = css({ display: "flex", justifyContent: "flex-end", gap: "3" });

const inputRef = useTemplateRef<HTMLInputElement>("inputRef");

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
  <Dialog.Root
    :open="store.open"
    role="alertdialog"
    @escape-key-down="store.resolveConfirmAction(false)"
    @pointer-down-outside="store.resolveConfirmAction(false)"
  >
    <Dialog.Backdrop :class="cx(dialogClasses.backdrop, topLayer)" />
    <Dialog.Positioner :class="cx(dialogClasses.positioner, topLayer)">
      <Dialog.Content :class="dialogClasses.content">
        <div :class="content">
          <Dialog.Title :class="dialogClasses.title">{{ store.title }}</Dialog.Title>

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
            <button
              type="button"
              :class="button({ variant: 'outline' })"
              @click="store.resolveConfirmAction(false)"
            >
              {{ store.cancelLabel }}
            </button>
            <button
              type="button"
              :class="
                cx(
                  button(),
                  css({ colorPalette: store.showInput ? 'blue' : 'red' }),
                )
              "
              @click="store.resolveConfirmAction(true)"
            >
              {{ store.confirmLabel }}
            </button>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Positioner>
  </Dialog.Root>
</template>
