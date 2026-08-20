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
    <template #default="t">
      <ToastRoot :class="toastClasses.root">
        <UiSpinner v-if="t.type === 'loading'" size="sm" label="" aria-hidden="true" />
        <Stack gap="1" flex="1" maxWidth="100%">
          <ToastTitle v-if="t.title" :class="toastClasses.title">{{ t.title }}</ToastTitle>
          <ToastDescription v-if="t.description" :class="toastClasses.description">{{ t.description }}</ToastDescription>
        </Stack>
        <ToastActionTrigger v-if="t.action">{{ t.action.label }}</ToastActionTrigger>
        <ToastCloseTrigger v-if="t.closable" :class="toastClasses.closeTrigger" aria-label="Close toast">
          <X aria-hidden />
        </ToastCloseTrigger>
      </ToastRoot>
    </template>
  </Toaster>
</template>
