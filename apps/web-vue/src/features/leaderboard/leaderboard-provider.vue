<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";

import { useFullscreenStore } from "@/stores/fullscreen-store";

defineOptions({ name: "LeaderboardProvider" });
const fullscreen = useFullscreenStore();
function onKeydown(event: KeyboardEvent) { if (event.key.toLowerCase() === "f") void fullscreen.toggleFullscreen(); }
onMounted(() => window.addEventListener("keydown", onKeydown)); onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>
<template><slot /></template>
