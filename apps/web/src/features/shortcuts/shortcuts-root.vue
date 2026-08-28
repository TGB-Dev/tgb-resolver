<script setup lang="ts">
import ShortcutsOverlay from "./shortcuts-overlay.vue";
import { useRouteScopes } from "./use-route-scopes";
import { useShortcutsRegistration } from "./use-shortcuts";

// Activates command scopes based on the current route before registration so
// feature-scoped hotkeys only fire within their area of the app.
useRouteScopes();
// Registers every command binding with the HotkeyManager (reactive to rebinds
// and the overlay open state). Must run inside <HotkeysProvider>.
useShortcutsRegistration();
</script>

<template>
  <ShortcutsOverlay />
</template>
