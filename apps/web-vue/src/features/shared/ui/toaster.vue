<script setup lang="ts">
import { Toaster as ArkToaster, Toast } from "@ark-ui/vue";
import { X } from "@lucide/vue";
import { Stack } from "@styled-system/jsx";
import { toast } from "@styled-system/recipes";

import Spinner from "./spinner.vue";
import { toaster } from "./toaster";

const toastClasses = toast();
</script>

<template>
  <ArkToaster :toaster="toaster">
    <template #default="t">
      <Toast.Root :class="toastClasses.root">
        <Spinner v-if="t.type === 'loading'" size="sm" label="" aria-hidden="true" />
        <Stack gap="1" flex="1" maxWidth="100%">
          <Toast.Title v-if="t.title" :class="toastClasses.title">{{ t.title }}</Toast.Title>
          <Toast.Description v-if="t.description" :class="toastClasses.description">{{
            t.description
          }}</Toast.Description>
        </Stack>
        <Toast.ActionTrigger v-if="t.action">{{ t.action.label }}</Toast.ActionTrigger>
        <Toast.CloseTrigger
          v-if="t.closable"
          :class="toastClasses.closeTrigger"
          aria-label="Close toast"
        >
          <X aria-hidden />
        </Toast.CloseTrigger>
      </Toast.Root>
    </template>
  </ArkToaster>
</template>
