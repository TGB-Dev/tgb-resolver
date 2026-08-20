<script setup lang="ts">
import { Box } from "@styled-system/jsx";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { LeaderboardEntry } from "@tgb-resolver/realtime";
import { computed, watchEffect } from "vue";

import { useControlShowQuery } from "@/features/control/composables/use-show";
import { usePlaybackStore } from "@/features/control/playback-store";
import ControlRealtimeProvider from "@/features/control/realtime-provider.vue";

import ActiveExtensionsOverlay from "./active-extensions-overlay.vue";
import LeaderboardProvider from "./leaderboard-provider.vue";
import LeaderboardRow from "./leaderboard-row.vue";
import { useLeaderboardStore } from "./leaderboard-store";
import LeaderboardTable from "./leaderboard-table.vue";

const props = withDefaults(
  defineProps<{
    isBigScreen?: boolean;
  }>(),
  {
    isBigScreen: true,
  },
);

const query = useControlShowQuery();
const leaderboard = useLeaderboardStore();
const playback = usePlaybackStore();

const SCROLL_POSITION_KEY = "tgb-resolver:leaderboard-scroll-position";

const rows = computed(() =>
  leaderboard.userIds
    .map((userId) => ({ userId, data: leaderboard.getSignal(userId).value }))
    .filter((row): row is { userId: number; data: LeaderboardEntry } => row.data !== null),
);

watchEffect(() => {
  const show = query.data.value;
  if (!show) return;

  const currentEventId = playback.currentEventId;
  leaderboard.sync(show, currentEventId ?? 0);

  if (currentEventId == null) {
    leaderboard.currentResolvedUserId = 0;
    leaderboard.currentBottomView = 0;

    const saved = localStorage.getItem(SCROLL_POSITION_KEY);
    if (saved) {
      const userId = Number(saved);
      if (leaderboard.userIds.includes(userId)) {
        leaderboard.currentBottomView = userId;
      }
    }
    return;
  }

  const currentEvent = show.timeline.find((item) => item.id === currentEventId);
  if (currentEvent == null) return;

  if (currentEvent.type === TimelineEventType.PRE || currentEvent.type === TimelineEventType.RES) {
    const userId = currentEvent.payload.userId;
    leaderboard.currentResolvedUserId = userId;
    const rank = leaderboard.userIds.indexOf(userId);
    if (rank >= 0) {
      const viewIndex = Math.min(rank + 2, leaderboard.userIds.length - 1);
      leaderboard.currentBottomView = leaderboard.userIds[viewIndex] ?? 0;
    }
  } else {
    leaderboard.currentResolvedUserId = 0;
    leaderboard.currentBottomView = 0;
  }
});

watchEffect(() => {
  const targetId = leaderboard.currentBottomView;
  if (targetId > 0) {
    localStorage.setItem(SCROLL_POSITION_KEY, String(targetId));
  }
});
</script>

<template>
  <ControlRealtimeProvider>
    <LeaderboardProvider :isBigScreen="props.isBigScreen">
      <Box position="relative">
        <Box h="100dvh" overflowY="auto" style="overflow-anchor: none;" data-audience-scroll>
          <template v-if="query.data.value">
            <LeaderboardTable :problems="query.data.value.contest.problems">
              <LeaderboardRow
                v-for="row in rows"
                :key="row.userId"
                :data="row.data"
                :is-current-resolved="leaderboard.currentResolvedUserId === row.userId"
              />
            </LeaderboardTable>
            <ActiveExtensionsOverlay />
          </template>
        </Box>

        <!-- Overlay to prevent manual interaction to the resolve leaderboard by absorbing all events -->
        <Box
          position="absolute"
          top="0"
          left="0"
          w="full"
          h="full"
          overflow="hidden"
          pointerEvents="auto"
          zIndex="9999"
        />
      </Box>
    </LeaderboardProvider>
  </ControlRealtimeProvider>
</template>
