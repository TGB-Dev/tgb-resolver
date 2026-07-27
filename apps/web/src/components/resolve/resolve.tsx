import { useSignalEffect } from "@preact/signals-react";
import { For, useLiveSignal } from "@preact/signals-react/utils";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { ResolvePayload } from "@tgb-resolver/realtime";
import { memo } from "react";

import { useControlShowQuery } from "@/features/control/hooks";
import { leaderboardModel, playbackModel } from "@/models";

import LeaderboardRow from "./leaderboard-row";
import LeaderboardTable from "./leaderboard-table";

const Row = memo(function Row({ userId }: { userId: number }) {
  const data = leaderboardModel.getSignal(userId).value;
  if (data == null) return null;
  return <LeaderboardRow data={data} />;
});

function LeaderboardRows() {
  return <For each={leaderboardModel.userIds}>{(uid) => <Row userId={uid} />}</For>;
}

export function Resolve() {
  const data = useLiveSignal(useControlShowQuery().data);

  useSignalEffect(() => {
    const d = data.value;
    if (d == null) return;
    leaderboardModel.sync(d, playbackModel.currentEventId.value ?? undefined);

    // Firstly, get current event
    const currentEventId = playbackModel.currentEventId.value;
    if (currentEventId == null) return;

    const currentEvent = d.timeline[currentEventId - 1];
    if (currentEvent == null) return;

    if (currentEvent.type === TimelineEventType.PRE) {
      const payload: ResolvePayload = currentEvent.payload;
      leaderboardModel.currentResolvedUserId.value = payload.userId;

      const resolvedUserId = leaderboardModel.currentResolvedUserId.value;
      const resolvedUserRank = leaderboardModel.userIds.value.indexOf(resolvedUserId);

      if (resolvedUserRank != null) {
        let rankIdx = 0;
        // Offset by 3 for clarity
        for (
          let i = resolvedUserRank;
          i < Math.min(resolvedUserRank + 3, leaderboardModel.userIds.value.length);
          i++
        ) {
          rankIdx = i;
        }

        leaderboardModel.currentBottomView.value = leaderboardModel.userIds.value[rankIdx];
      }
    }
  });

  if (data.value == null) return null;

  return (
    <LeaderboardTable problems={data.value.contest.problems}>
      <LeaderboardRows />
    </LeaderboardTable>
  );
}
