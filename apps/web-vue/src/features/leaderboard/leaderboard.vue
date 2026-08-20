<script setup lang="ts">
import { Center, VStack } from "@styled-system/jsx";
import { watchEffect } from "vue";

import { useControlShowQuery } from "@/features/control/composables/use-show";
import { usePlaybackStore } from "@/features/control/playback-store";
import UiHeading from "@/features/shared/ui/heading.vue";

import LeaderboardRow from "./leaderboard-row.vue";
import { useLeaderboardStore } from "./leaderboard-store";
import LeaderboardTable from "./leaderboard-table.vue";

defineOptions({ name: "LeaderboardView" });
const query = useControlShowQuery();
const leaderboard = useLeaderboardStore();
const playback = usePlaybackStore();
watchEffect(() => {
  const show = query.data.value;
  if (show) leaderboard.sync(show, playback.currentEventId ?? 0);
});
</script>
<template><Center minH="100dvh" data-audience-scroll><VStack gap="4" alignItems="stretch" w="full" p="4"><UiHeading size="2xl">Audience</UiHeading><span v-if="query.isLoading.value">Loading show…</span><span v-else-if="!query.data.value">No show loaded</span><LeaderboardTable v-else :problems="query.data.value.contest.problems"><template v-for="userId in leaderboard.userIds" :key="userId"><LeaderboardRow v-if="leaderboard.getSignal(userId).value" :data="leaderboard.getSignal(userId).value!" :is-current-resolved="leaderboard.currentResolvedUserId === userId" /></template></LeaderboardTable></VStack></Center></template>
