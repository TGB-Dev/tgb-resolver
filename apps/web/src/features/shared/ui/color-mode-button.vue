<script setup lang="ts">
import { ClientOnly } from "@ark-ui/vue";
import { Moon, Sun } from "@lucide/vue";
import { cx } from "@styled-system/css";
import { button, iconButton } from "@styled-system/recipes";

import { useColorMode } from "./color-mode";

const { colorMode, toggleColorMode } = useColorMode();
</script>

<template>
  <ClientOnly>
    <button
      type="button"
      aria-label="Toggle color mode"
      :class="cx(button({ variant: 'ghost' }), iconButton())"
      @click="toggleColorMode"
    >
      <Moon v-if="colorMode === 'dark'" :size="18" aria-hidden />
      <Sun v-else :size="18" aria-hidden />
    </button>
  </ClientOnly>
</template>
