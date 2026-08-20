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
import { toast } from "@styled-system/recipes";

import UiSpinner from "./spinner.vue";
import { toaster } from "./toaster";

const toastClasses = toast();
</script>

<template>
  <Toaster :toaster="toaster">
    <template #default="toast">
      <ToastRoot :class="toastClasses.root">
        <UiSpinner v-if="toast.type === 'loading'" size="sm" label="" aria-hidden="true" />
        <Stack gap="1" flex="1" maxWidth="100%">
          <ToastTitle v-if="toast.title" :class="toastClasses.title">{{ toast.title }}</ToastTitle>
          <ToastDescription v-if="toast.description" :class="toastClasses.description">{{ toast.description }}</ToastDescription>
        </Stack>
        <ToastActionTrigger v-if="toast.action">{{ toast.action.label }}</ToastActionTrigger>
        <ToastCloseTrigger v-if="toast.closable" :class="toastClasses.closeTrigger" aria-label="Close toast">
          <X aria-hidden />
        </ToastCloseTrigger>
      </ToastRoot>
    </template>
  </Toaster>
</template>
