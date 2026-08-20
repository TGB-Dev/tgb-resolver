<script setup lang="ts">
import { Center, VStack } from "@styled-system/jsx";

import { useControlShowQuery } from "@/features/control/composables/use-show";
import UiHeading from "@/features/shared/ui/heading.vue";

defineOptions({ name: "LeaderboardView" });
const query = useControlShowQuery();
</script>
<template><Center minH="100dvh" data-audience-scroll><VStack gap="2"><UiHeading size="2xl">Audience</UiHeading><span v-if="query.isLoading.value">Loading show…</span><span v-else-if="!query.data.value">No show loaded</span><span v-else>Leaderboard ready</span></VStack></Center></template>
