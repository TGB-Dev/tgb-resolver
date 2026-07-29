import { createModel, type Signal, signal } from "@preact/signals-react";
import type { LeaderboardEntry, ShowFile } from "@tgb-resolver/realtime";
import { deriveLeaderboard } from "@tgb-resolver/realtime";

import { entryEqual } from "@/lib/leaderboard-comparators";

interface LeaderboardModelState {
  userIds: Signal<number[]>;
  getSignal: (userId: number) => Signal<LeaderboardEntry | null>;
  currentBottomView: Signal<number>;
  currentResolvedUserId: Signal<number>;
  sync: (show: ShowFile, upToEventId?: number) => void;
}

const LeaderboardModel = createModel<LeaderboardModelState>(() => {
  const userIds = signal<number[]>([]);
  const signals = new Map<number, Signal<LeaderboardEntry | null>>();
  const currentBottomView = signal<number>(0);
  const currentResolvedUserId = signal<number>(0);

  function getSignal(userId: number): Signal<LeaderboardEntry | null> {
    let sig = signals.get(userId);
    if (!sig) {
      sig = signal<LeaderboardEntry | null>(null);
      signals.set(userId, sig);
    }
    return sig;
  }

  function sync(show: ShowFile, upToEventId?: number): void {
    const rows = deriveLeaderboard(show, upToEventId);
    for (const row of rows) {
      const sig = getSignal(row.userId);
      const current = sig.peek();
      if (current == null || !entryEqual(current, row)) {
        sig.value = row;
      }
    }
    const prevIds = userIds.peek();
    const newIds = rows.map((r) => r.userId);
    if (prevIds.length !== newIds.length || prevIds.some((id, i) => id !== newIds[i])) {
      userIds.value = newIds;
    }
  }

  return { userIds, getSignal, sync, currentBottomView, currentResolvedUserId };
});

export const leaderboardModel = new LeaderboardModel();
