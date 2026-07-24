import { useSignalEffect } from "@preact/signals-react";
import { For, useLiveSignal } from "@preact/signals-react/utils";
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
  });

  if (data.value == null) return null;

  return (
    <LeaderboardTable problems={data.value.contest.problems}>
      <LeaderboardRows />
    </LeaderboardTable>
  );
}
