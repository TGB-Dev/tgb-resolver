<script setup lang="ts">
import {
  ToastActionTrigger,
  ToastCloseTrigger,
  ToastDescription,
  Toaster,
  ToastRoot,
  ToastTitle,
} from "@ark-ui/vue";
import { X } from "@lucide/vue";
import { Stack } from "@styled-system/jsx";

import { toaster } from "./toaster";
</script>

<template>
  <Toaster :toaster="toaster">
    <template #default="toast">
      <ToastRoot class="tgb-toast-root">
        <span v-if="toast.type === 'loading'" aria-hidden class="tgb-toast-spinner" />
        <Stack gap="1" flex="1" maxWidth="100%">
          <ToastTitle v-if="toast.title">{{ toast.title }}</ToastTitle>
          <ToastDescription v-if="toast.description">{{ toast.description }}</ToastDescription>
        </Stack>
        <ToastActionTrigger v-if="toast.action">{{ toast.action.label }}</ToastActionTrigger>
        <ToastCloseTrigger v-if="toast.closable" aria-label="Close toast">
          <X aria-hidden />
        </ToastCloseTrigger>
      </ToastRoot>
    </template>
  </Toaster>
</template>

<style scoped>
.tgb-toast-root {
  width: min(24rem, calc(100vw - 2rem));
}

.tgb-toast-spinner {
  width: 1.1rem;
  height: 1.1rem;
  border: 2px solid var(--colors-border-muted);
  border-top-color: var(--colors-fg-muted);
  border-radius: 9999px;
  animation: tgb-toast-spin 0.9s linear infinite;
  flex: none;
}

@keyframes tgb-toast-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>