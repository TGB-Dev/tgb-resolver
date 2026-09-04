import type { LeaderboardEntry, ShowFile } from "@tgb-resolver/realtime";
import { deriveLeaderboard } from "@tgb-resolver/realtime";
import { defineStore } from "pinia";
import { ref } from "vue";

import { entryEqual } from "@/lib/leaderboard-comparators";

export const useLeaderboardStore = defineStore("leaderboard", () => {
  const userIds = ref<number[]>([]);
  // Vue tracks Record access per key, so each leaderboard row reading
  // entries[userId] re-evaluates only when that user's entry changes —
  // the fine-grained update the React/Preact port previously hand-rolled
  // with a lazily-created Ref-per-user map.
  const entries = ref<Record<number, LeaderboardEntry | null>>({});
  const currentBottomView = ref(0);
  const currentResolvedUserId = ref(0);
  /** The (userId, problemId) pair of the most recent PRE/RES event, if any. */
  const latestResolved = ref<{ userId: number; problemId: number } | null>(null);
  const isBigScreen = ref(false);
  let lastDeriveKey: { show: ShowFile; upToEventId?: number } | null = null;
  function entryFor(userId: number): LeaderboardEntry | null {
    return entries.value[userId] ?? null;
  }
  function sync(show: ShowFile, upToEventId?: number) {
    if (lastDeriveKey?.show === show && lastDeriveKey.upToEventId === upToEventId) return;
    lastDeriveKey = { show, upToEventId };
    const rows = deriveLeaderboard(show, upToEventId);
    for (const row of rows) {
      const current = entries.value[row.userId];
      if (current == null || !entryEqual(current, row)) entries.value[row.userId] = row;
    }
    const ids = rows.map((row) => row.userId);
    if (ids.length !== userIds.value.length || ids.some((id, index) => id !== userIds.value[index]))
      userIds.value = ids;
  }
  return {
    userIds,
    entries,
    entryFor,
    sync,
    currentBottomView,
    currentResolvedUserId,
    latestResolved,
    isBigScreen,
  };
});
