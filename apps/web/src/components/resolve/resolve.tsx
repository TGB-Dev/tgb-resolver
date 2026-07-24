import { useComputed } from "@preact/signals-react";
import { For, useLiveSignal } from "@preact/signals-react/utils";
import { deriveLeaderboard } from "@tgb-resolver/realtime";

import { useControlShowQuery } from "@/features/control/hooks";
import { playbackModel } from "@/models";

import LeaderboardRow from "./leaderboard-row";
import LeaderboardTable from "./leaderboard-table";

export function Resolve() {
  const data = useLiveSignal(useControlShowQuery().data);
  const rows = useComputed(() => {
    const d = data.value;
    if (d == null) return [];
    return deriveLeaderboard(d, playbackModel.currentEventId.value ?? undefined);
  });

  if (data.value == null) return null;

  return (
    <LeaderboardTable problems={data.value.contest.problems}>
      <For each={rows} getKey={(entry) => entry.userId}>
        {(entry) => <LeaderboardRow data={entry} />}
      </For>
    </LeaderboardTable>
  );
}
