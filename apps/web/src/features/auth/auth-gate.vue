<script setup lang="ts">
import JoinScreen from "@/features/auth/join-screen.vue";
import { useAuthStore } from "@/stores/auth-store";

const authStore = useAuthStore();
</script>

<template>
  <JoinScreen v-if="!authStore.isAuthenticated" />
  <slot v-else />
</template>
