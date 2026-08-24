<script setup lang="ts">
import type { TanStackDevtoolsVuePlugin } from "@tanstack/vue-devtools";
import { TanStackDevtools } from "@tanstack/vue-devtools";
import { HotkeysDevtoolsPanel } from "@tanstack/vue-hotkeys-devtools";
import { VueQueryDevtoolsPanel } from "@tanstack/vue-query-devtools";

const isDev = import.meta.env.DEV;

const plugins: TanStackDevtoolsVuePlugin[] = [
  {
    name: "TanStack Query",
    component: VueQueryDevtoolsPanel,
    props: {
      theme: "dark",
    },
  },
  {
    name: "TanStack Hotkeys",
    component: HotkeysDevtoolsPanel,
    props: {
      theme: "dark",
    },
  },
];
</script>

<template>
  <TanStackDevtools v-if="isDev" :config="{ position: 'bottom-right' }" :plugins="plugins" />
</template>

<style scoped></style>
