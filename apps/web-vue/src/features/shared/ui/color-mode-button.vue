<script setup lang="ts">
import { ClientOnly } from "@ark-ui/vue";
import { Moon, Sun } from "@lucide/vue";

import { useColorMode } from "./color-mode";
import IconButton from "./icon-button.vue";

const { colorMode, toggleColorMode } = useColorMode();
</script>

<template>
  <ClientOnly>
    <IconButton ariaLabel="Toggle color mode" @click="toggleColorMode">
      <Moon v-if="colorMode === 'dark'" :size="18" aria-hidden />
      <Sun v-else :size="18" aria-hidden />
    </IconButton>
  </ClientOnly>
</template>
