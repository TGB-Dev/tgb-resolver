<script setup lang="ts">
import { Center, VStack } from "@styled-system/jsx";

import { useControlShowQuery } from "@/features/control/composables/use-show";

defineOptions({ name: "LeaderboardView" });
const query = useControlShowQuery();
</script>
<template><Center minH="100dvh" data-audience-scroll><VStack gap="2"><h1>Audience</h1><span v-if="query.isLoading.value">Loading show…</span><span v-else-if="!query.data.value">No show loaded</span><span v-else>Leaderboard ready</span></VStack></Center></template>
<style scoped>h1 { font-size: 2rem; }</style>
