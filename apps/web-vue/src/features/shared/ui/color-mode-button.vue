<script setup lang="ts">
import { ClientOnly } from "@ark-ui/vue";
import { Moon, Sun } from "@lucide/vue";

import { useColorMode } from "./color-mode";

const { colorMode, toggleColorMode } = useColorMode();
</script>

<template>
  <ClientOnly>
    <button type="button" class="_btn" aria-label="Toggle color mode" @click="toggleColorMode">
      <Moon v-if="colorMode === 'dark'" aria-hidden class="_icon" />
      <Sun v-else aria-hidden class="_icon" />
    </button>
  </ClientOnly>
</template>

<style scoped>
._btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: var(--radii-md);
  background: transparent;
  color: var(--colors-fg-muted);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

._btn:hover {
  background: var(--colors-bg-muted);
  color: var(--colors-fg);
}

._icon {
  width: 1.1rem;
  height: 1.1rem;
}
</style>