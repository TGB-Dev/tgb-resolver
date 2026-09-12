<script setup lang="ts">
import { Toaster as ArkToaster, Toast } from "@ark-ui/vue";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "@lucide/vue";
import { css } from "@styled-system/css";
import { toast } from "@styled-system/recipes";

import { createStyleContext } from "@/lib/style-context";

import Spinner from "./spinner.vue";
import { toaster } from "./toaster";

const { useRecipe } = createStyleContext(toast);
const toastClasses = useRecipe();

const indicatorFor = (type?: string) => {
  switch (type) {
    case "success":
      return CircleCheck;
    case "error":
      return CircleAlert;
    case "warning":
      return TriangleAlert;
    default:
      return Info;
  }
};
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
        w: { base: 'calc(100vw - 2rem)', sm: '24rem' },
      })
    "
  >
    <template #default="t">
      <Toast.Root :class="toastClasses.root">
        <Spinner v-if="t.type === 'loading'" size="sm" label="" aria-hidden="true" />
        <component :is="indicatorFor(t.type)" v-else :class="toastClasses.indicator" aria-hidden />
        <Toast.Title v-if="t.title" :class="toastClasses.title">{{ t.title }}</Toast.Title>
        <Toast.Description v-if="t.description" :class="toastClasses.description">{{
          t.description
        }}</Toast.Description>
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
