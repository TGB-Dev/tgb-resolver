<script setup lang="ts">
import { Center, VStack } from "@styled-system/jsx";
import type { LeaderboardEntry } from "@tgb-resolver/realtime";
import { computed, watchEffect } from "vue";

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
const rows = computed(() => leaderboard.userIds.map((userId) => ({ userId, data: leaderboard.getSignal(userId).value })).filter((row): row is { userId: number; data: LeaderboardEntry } => row.data !== null));
watchEffect(() => {
  const show = query.data.value;
  if (show) leaderboard.sync(show, playback.currentEventId ?? 0);
});
</script>
<template><Center minH="100dvh" data-audience-scroll><VStack gap="4" alignItems="stretch" w="full" p="4"><UiHeading size="2xl">Audience</UiHeading><span v-if="query.isLoading.value">Loading show…</span><span v-else-if="!query.data.value">No show loaded</span><LeaderboardTable v-else :problems="query.data.value.contest.problems"><LeaderboardRow v-for="row in rows" :key="row.userId" :data="row.data" :is-current-resolved="leaderboard.currentResolvedUserId === row.userId" /></LeaderboardTable></VStack></Center></template>
