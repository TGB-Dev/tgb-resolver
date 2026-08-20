import type { LeaderboardEntry, ShowFile } from "@tgb-resolver/realtime";
import { deriveLeaderboard } from "@tgb-resolver/realtime";
import { defineStore } from "pinia";
import { type Ref, ref } from "vue";

import { entryEqual } from "@/lib/leaderboard-comparators";

export const useLeaderboardStore = defineStore("leaderboard", () => {
  const userIds = ref<number[]>([]);
  const signals = new Map<number, Ref<LeaderboardEntry | null>>();
  const currentBottomView = ref(0);
  const currentResolvedUserId = ref(0);
  let lastDeriveKey: { show: ShowFile; upToEventId?: number } | null = null;
  function getSignal(userId: number) {
    let result = signals.get(userId);
    if (!result) {
      result = ref(null);
      signals.set(userId, result);
    }
    return result;
  }
  function sync(show: ShowFile, upToEventId?: number) {
    if (lastDeriveKey?.show === show && lastDeriveKey.upToEventId === upToEventId) return;
    lastDeriveKey = { show, upToEventId };
    const rows = deriveLeaderboard(show, upToEventId);
    for (const row of rows) {
      const current = getSignal(row.userId);
      if (current.value == null || !entryEqual(current.value, row)) current.value = row;
    }
    const ids = rows.map((row) => row.userId);
    if (ids.length !== userIds.value.length || ids.some((id, index) => id !== userIds.value[index]))
      userIds.value = ids;
  }
  return { userIds, getSignal, sync, currentBottomView, currentResolvedUserId };
});
