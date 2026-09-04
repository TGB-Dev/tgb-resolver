<script setup lang="ts">
import { Toaster as ArkToaster, Toast } from "@ark-ui/vue";
import { X } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { toast } from "@styled-system/recipes";

import { createStyleContext } from "@/lib/style-context";

import Spinner from "./spinner.vue";
import { toaster } from "./toaster";

const { useRecipe } = createStyleContext(toast);
const toastClasses = useRecipe();

const severity = (type?: string) =>
  css({
    borderColor: type === "error" ? "red.500" : type === "success" ? "green.600" : "border",
    _icon: {
      color: type === "error" ? "red.500" : type === "success" ? "green.600" : "fg.muted",
    },
  });
</script>

<template>
  <ArkToaster
    :toaster="toaster"
    :class="
      css({
        position: 'fixed',
        bottom: 0,
        right: 0,
        zIndex: 'toast',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: 4,
      })
    "
  >
    <template #default="t">
      <Toast.Root :class="cx(toastClasses.root, severity(t.type))">
        <Spinner v-if="t.type === 'loading'" size="sm" label="" aria-hidden="true" />
        <div
          :class="css({ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, maxW: 'full' })"
        >
          <Toast.Title v-if="t.title" :class="toastClasses.title">{{ t.title }}</Toast.Title>
          <Toast.Description v-if="t.description" :class="toastClasses.description">{{
            t.description
          }}</Toast.Description>
        </div>
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
