<script setup lang="ts">
import { css } from "@styled-system/css";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { LeaderboardEntry } from "@tgb-resolver/realtime";
import { computed, nextTick, useTemplateRef, watch } from "vue";

import { useControlShowQuery } from "@/features/control/composables/use-show";
import { usePlaybackStore } from "@/features/control/playback-store";
import { animateScrollIntoView } from "@/features/leaderboard/utils/scroll";
import { TgbResolverEasings } from "@/features/shared/anim/easings";
import { useLeaderboardStore } from "@/stores/leaderboard-store";

import ActiveExtensionsOverlay from "./active-extensions-overlay.vue";
import LeaderboardRow from "./leaderboard-row.vue";
import LeaderboardTable from "./leaderboard-table.vue";

const props = withDefaults(
  defineProps<{ isBigScreen?: boolean }>(),
  { isBigScreen: false },
);

const query = useControlShowQuery();
const leaderboard = useLeaderboardStore();
const playback = usePlaybackStore();

const SCROLL_POSITION_KEY = "tgb-resolver:leaderboard-scroll-position";

watch(
  () => props.isBigScreen,
  (v) => {
    leaderboard.isBigScreen = v ?? false;
  },
  { immediate: true },
);

const rows = computed(() =>
  leaderboard.userIds
    .map((userId) => ({ userId, data: leaderboard.getSignal(userId).value }))
    .filter((row): row is { userId: number; data: LeaderboardEntry } => row.data !== null),
);

watch(
  () => [query.data.value, playback.currentEventId],
  () => {
    const show = query.data.value;
    if (!show) return;

    const currentEventId = playback.currentEventId;
    leaderboard.sync(show, currentEventId ?? 0);

    if (currentEventId == null) {
      leaderboard.currentResolvedUserId = 0;
      leaderboard.latestResolved = null;
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
      if (userId == null) return;
      leaderboard.currentResolvedUserId = userId;
      leaderboard.latestResolved =
        userId != null && currentEvent.payload.problemId != null
          ? { userId, problemId: currentEvent.payload.problemId }
          : null;

      const rank = leaderboard.userIds.indexOf(userId);
      if (rank >= 0) {
        const viewIndex = Math.min(rank + 2, leaderboard.userIds.length - 1);
        leaderboard.currentBottomView = leaderboard.userIds[viewIndex] ?? 0;
      }
    } else {
      leaderboard.currentResolvedUserId = 0;
      leaderboard.latestResolved = null;
      leaderboard.currentBottomView = 0;
    }
  },
  { immediate: true },
);

watch(
  () => leaderboard.currentBottomView,
  (targetId) => {
    if (targetId > 0) {
      localStorage.setItem(SCROLL_POSITION_KEY, String(targetId));
    }

    // Follow the bottom-view target: scroll it to the container's end edge,
    // mirroring the React reference. Runs after DOM flush + a frame so the
    // row layout is final before measuring.
    if (targetId <= 0 || !scroller.value) return;
    void nextTick(() => {
      requestAnimationFrame(() => {
        const el = scroller.value?.querySelector<HTMLElement>(
          `[data-user-id="${targetId}"]`,
        );
        if (!el || !scroller.value) return;
        animateScrollIntoView(el, scroller.value, {
          block: "end",
          duration: 0.8,
          ease: TgbResolverEasings.inOutQuad,
        });
      });
    });
  },
);

const scroller = useTemplateRef<HTMLElement>("scroller");
</script>

<template>
  <div :class="css({ h: 'full', position: 'relative', display: 'flex', flexDirection: 'column' })">
    <div
      ref="scroller"
      :class="css({ flex: 1, minHeight: 0, overflowY: 'auto', overflowAnchor: 'none' })"
      data-audience-scroll
    >
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
    </div>
  </div>
</template>
