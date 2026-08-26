<script setup lang="ts">
import ShortcutsOverlay from "./shortcuts-overlay.vue";
import { useShortcutsRegistration } from "./use-shortcuts";

// Registers every command binding with the HotkeyManager (reactive to rebinds
// and the overlay open state). Must run inside <HotkeysProvider>.
useShortcutsRegistration();
</script>

<template>
  <ShortcutsOverlay />
</template>
