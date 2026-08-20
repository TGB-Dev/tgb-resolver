<script setup lang="ts">
import { onMounted, onUnmounted, provide, readonly, ref } from "vue";

import { useFullscreenStore } from "@/stores/fullscreen-store";

defineOptions({ name: "LeaderboardProvider" });

const props = defineProps<{
  isBigScreen?: boolean;
}>();

const fullscreen = useFullscreenStore();
const isBigScreenRef = ref(props.isBigScreen ?? false);

provide("isBigScreen", readonly(isBigScreenRef));

function onKeydown(event: KeyboardEvent) {
  if (event.key.toLowerCase() === "f") {
    fullscreen.toggleFullscreen();
  }
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <slot />
</template>
