<script setup lang="ts">
import { css } from "@styled-system/css";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { LeaderboardEntry } from "@tgb-resolver/realtime";
import { computed, nextTick, onMounted, useTemplateRef, watch } from "vue";

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

const scroller = useTemplateRef<HTMLElement>("scroller");

// Scrolls the container's last row to its end edge. Runs after DOM flush plus
// a frame so the row layout is final before measuring.
function scrollToEnd(duration = 0.8) {
  void nextTick(() => {
    requestAnimationFrame(() => {
      const scrollerEl = scroller.value;
      if (!scrollerEl) return;
      const last = scrollerEl.querySelector<HTMLElement>("[data-user-id]:last-of-type");
      if (!last) return;
      animateScrollIntoView(last, scrollerEl, {
        block: "end",
        duration,
        ease: TgbResolverEasings.inOutQuad,
      });
    });
  });
}

function scrollToUser(userId: number, duration = 0.8) {
  void nextTick(() => {
    requestAnimationFrame(() => {
      const scrollerEl = scroller.value;
      if (!scrollerEl) return;
      const el = scrollerEl.querySelector<HTMLElement>(`[data-user-id="${userId}"]`);
      if (!el) return;
      animateScrollIntoView(el, scrollerEl, {
        block: "end",
        duration,
        ease: TgbResolverEasings.inOutQuad,
      });
    });
  });
}

const rows = computed(() =>
  leaderboard.userIds
    .map((userId) => ({ userId, data: leaderboard.entryFor(userId) }))
    .filter((row): row is { userId: number; data: LeaderboardEntry } => row.data !== null),
);

watch(
  () => props.isBigScreen,
  (v) => {
    leaderboard.isBigScreen = v ?? false;
  },
  { immediate: true },
);

const hasRows = computed(() => rows.value.length > 0);

// Scroll to the current rank on mount (falls back to the end while idle).
// Rows may not exist yet on the first paint, so also fire once when the
// first row renders.
let hasScrolledOnMount = false;
function scrollToCurrentOnMount() {
  if (hasScrolledOnMount || !hasRows.value) return;
  hasScrolledOnMount = true;
  const targetId = leaderboard.currentBottomView;
  if (targetId > 0) {
    scrollToUser(targetId);
  } else {
    scrollToEnd();
  }
}

onMounted(scrollToCurrentOnMount);
watch(hasRows, (value) => {
  if (value) scrollToCurrentOnMount();
});

watch(
  () => [query.data.value, playback.currentEventId],
  () => {
    const show = query.data.value;
    if (!show) return;

    const currentEventId = playback.currentEventId;
    leaderboard.sync(show, currentEventId ?? 0);

    if (currentEventId == null) {
      // Idle (or before start): park the view at the end of the standings.
      leaderboard.currentResolvedUserId = 0;
      leaderboard.latestResolved = null;
      leaderboard.currentBottomView = 0;
      scrollToEnd();
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
      // Follow the bottom-view target: scroll it to the container's end edge,
      // mirroring the React reference.
      scrollToUser(targetId);
    }
  },
);
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
