<script setup lang="ts">
import { css } from "@styled-system/css";
import { useVirtualizer } from "@tanstack/vue-virtual";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { LeaderboardEntry } from "@tgb-resolver/realtime";
import { computed, onMounted, useTemplateRef, watch } from "vue";

import { useControlShowQuery } from "@/features/control/composables/use-show";
import { usePlaybackStore } from "@/features/control/playback-store";
import { scrollToListItem } from "@/features/leaderboard/utils/scroll";
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

const rows = computed(() =>
  leaderboard.userIds
    .map((userId) => ({ userId, data: leaderboard.entryFor(userId) }))
    .filter((row): row is { userId: number; data: LeaderboardEntry } => row.data !== null),
);

// FLIP rank animation is O(n) layout work, so it stays on for small
// standings and the virtualizer takes over above this threshold (where FLIP
// would both jank and collide with the virtual translate).
const LEADERBOARD_VIRTUALIZE_THRESHOLD = 100;

const shouldVirtualize = computed(() => rows.value.length > LEADERBOARD_VIRTUALIZE_THRESHOLD);

// Virtualized table (TanStack table-example pattern: per-row translate inside
// a totalSize sizer). Fixed heights match LeaderboardRow (44px / 76px big).
const rowVirtualizerOptions = computed(() => ({
  count: rows.value.length,
  getScrollElement: () => scroller.value,
  estimateSize: () => (leaderboard.isBigScreen ? 76 : 44),
  overscan: 10,
  enabled: shouldVirtualize.value,
  getItemKey: (index: number) => rows.value[index]?.userId ?? index,
}));
const rowVirtualizer = useVirtualizer(rowVirtualizerOptions);
const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems());
const totalSize = computed(() => rowVirtualizer.value.getTotalSize());

interface LeaderboardRenderItem {
  key: string;
  userId: number;
  data: LeaderboardEntry;
  transform: string;
}
const renderList = computed<LeaderboardRenderItem[]>(() =>
  virtualRows.value.map((virtualRow, loopIndex) => {
    const entry = rows.value[virtualRow.index] as { userId: number; data: LeaderboardEntry };
    return {
      key: String(virtualRow.key),
      userId: entry.userId,
      data: entry.data,
      transform: `translateY(${virtualRow.start - loopIndex * virtualRow.size}px)`,
    };
  }),
);

// Follow-scrolls route through one helper: index + virtualizer.scrollToIndex
// when windowed (off-screen rows aren't mounted, so selectors can't find
// them), motion-tweened querySelector lookup otherwise.
function scrollToEnd(behavior: "auto" | "smooth" = "smooth") {
  if (rows.value.length === 0) return;
  if (shouldVirtualize.value) {
    scrollToListItem({
      container: scroller.value,
      virtualizer: rowVirtualizer.value,
      index: rows.value.length - 1,
      align: "end",
      behavior,
    });
  } else {
    scrollToListItem({
      container: scroller.value,
      selector: "[data-user-id]:last-of-type",
      align: "end",
      duration: 0.8,
      ease: TgbResolverEasings.inOutQuad,
    });
  }
}

function scrollToUser(userId: number, behavior: "auto" | "smooth" = "smooth") {
  if (shouldVirtualize.value) {
    scrollToListItem({
      container: scroller.value,
      virtualizer: rowVirtualizer.value,
      index: leaderboard.userIds.indexOf(userId),
      align: "end",
      behavior,
    });
  } else {
    scrollToListItem({
      container: scroller.value,
      selector: `[data-user-id="${userId}"]`,
      align: "end",
      duration: 0.8,
      ease: TgbResolverEasings.inOutQuad,
    });
  }
}

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
    scrollToUser(targetId, "auto");
  } else {
    scrollToEnd("auto");
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
        <LeaderboardTable
          :problems="query.data.value.contest.problems"
          :total-size="shouldVirtualize ? totalSize : undefined"
        >
          <template v-if="shouldVirtualize">
            <LeaderboardRow
              v-for="item in renderList"
              :key="item.key"
              :data="item.data"
              :is-current-resolved="leaderboard.currentResolvedUserId === item.userId"
              :style="{ transform: item.transform }"
            />
          </template>
          <template v-else>
            <LeaderboardRow
              v-for="row in rows"
              :key="row.userId"
              :data="row.data"
              :is-current-resolved="leaderboard.currentResolvedUserId === row.userId"
              :flip="true"
            />
          </template>
        </LeaderboardTable>
        <ActiveExtensionsOverlay />
      </template>
    </div>
  </div>
</template>
