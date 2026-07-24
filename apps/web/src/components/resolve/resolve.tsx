import { useSignalEffect } from "@preact/signals-react";
import { useLiveSignal } from "@preact/signals-react/utils";

import { useControlShowQuery } from "@/features/control/hooks";
import { leaderboardModel, playbackModel } from "@/models";

import LeaderboardRow from "./leaderboard-row";
import LeaderboardTable from "./leaderboard-table";

function Row({ userId }: { userId: number }) {
  const data = leaderboardModel.getSignal(userId).value;
  if (data == null) return null;
  return <LeaderboardRow data={data} />;
}

function LeaderboardRows() {
  const ids = leaderboardModel.userIds.value;
  return ids.map((uid) => <Row key={uid} userId={uid} />);
}

export function Resolve() {
  const data = useLiveSignal(useControlShowQuery().data);

  useSignalEffect(() => {
    const d = data.value;
    if (d == null) return;
    leaderboardModel.sync(d, playbackModel.currentEventId.value ?? undefined);
  });

  if (data.value == null) return null;

  return (
    <LeaderboardTable problems={data.value.contest.problems}>
      <LeaderboardRows />
    </LeaderboardTable>
  );
}
