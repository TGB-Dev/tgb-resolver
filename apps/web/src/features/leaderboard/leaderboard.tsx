import { useComputed, useSignalEffect } from "@preact/signals-react";
import { For, useLiveSignal } from "@preact/signals-react/utils";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { CustomEvent, ShowFile, TimelineEvent } from "@tgb-resolver/realtime";
import { AnimatePresence } from "motion/react";
import { createElement, memo } from "react";

import { useControlShowQuery } from "@/features/control/hooks";
import { playbackModel } from "@/features/control/playback-model";
import { ExtensionType, extensionRegistry, getExtensionPayload } from "@/features/extensions";
import { leaderboardModel } from "@/features/leaderboard/leaderboard-model";

import { isBigScreenSignal } from "./leaderboard-provider";
import { LeaderboardRow } from "./leaderboard-row";
import { LeaderboardTable } from "./leaderboard-table";

const ActiveExtensionsOverlay = memo(function ActiveExtensionsOverlay({
  timeline,
}: {
  timeline: ShowFile | undefined;
}) {
  const overlays = useComputed(() => {
    if (timeline == null) return [];
    const activeEventIds = playbackModel.state.value.activeEventIds;
    return timeline.timeline
      .filter(isCustomEvent)
      .filter((event) => activeEventIds.includes(event.id))
      .map((event) => {
        const extension = extensionRegistry.extensionWithExtId(event.payload.extId);
        if (extension?.type !== ExtensionType.WithReactComponent) return null;
        return createElement(extension.component, {
          key: event.id,
          payload: getExtensionPayload(event) ?? {},
        });
      })
      .filter((overlay) => overlay !== null);
  });

  return <AnimatePresence mode="wait">{overlays.value}</AnimatePresence>;
});

const Row = memo(function Row({ userId }: { userId: number }) {
  const data = leaderboardModel.getSignal(userId).value;
  const isCurrentResolved = leaderboardModel.currentResolvedUserId.value === userId;
  if (data == null) return null;
  return <LeaderboardRow data={data} isCurrentResolved={isCurrentResolved} />;
});

function isCustomEvent(event: TimelineEvent): event is CustomEvent {
  return event.type === TimelineEventType.CUS;
}

function LeaderboardRows() {
  return (
    <For each={leaderboardModel.userIds} getKey={(uid) => uid}>
      {(uid) => <Row userId={uid} />}
    </For>
  );
}

const SCROLL_POSITION_KEY = "tgb-resolver:leaderboard-scroll-position";

interface ResolveProps {
  isBigScreen?: boolean;
}

export function Resolve({ isBigScreen }: ResolveProps) {
  const data = useLiveSignal(useControlShowQuery().data);

  useSignalEffect(() => {
    const d = data.value;
    if (d == null) return;

    const currentEventId = playbackModel.currentEventId.value;
    leaderboardModel.sync(d, currentEventId ?? 0);

    if (currentEventId == null) {
      leaderboardModel.currentResolvedUserId.value = 0;
      leaderboardModel.currentBottomView.value = 0;

      const saved = localStorage.getItem(SCROLL_POSITION_KEY);
      if (saved) {
        const userId = Number(saved);
        if (leaderboardModel.userIds.value.includes(userId)) {
          leaderboardModel.currentBottomView.value = userId;
        }
      }
      return;
    }

    const currentEvent = d.timeline.find((e) => e.id === currentEventId);
    if (currentEvent == null) return;

    if (currentEvent.type === TimelineEventType.PRE) {
      const userId = currentEvent.payload.userId;
      leaderboardModel.currentResolvedUserId.value = userId;

      const rank = leaderboardModel.userIds.value.indexOf(userId);
      if (rank >= 0) {
        const viewIndex = Math.min(rank + 2, leaderboardModel.userIds.value.length - 1);
        leaderboardModel.currentBottomView.value = leaderboardModel.userIds.value[viewIndex];
      }
    } else if (currentEvent.type === TimelineEventType.RES) {
      leaderboardModel.currentResolvedUserId.value = currentEvent.payload.userId;
    } else {
      leaderboardModel.currentResolvedUserId.value = 0;
      leaderboardModel.currentBottomView.value = 0;
    }
  });

  useSignalEffect(() => {
    const targetId = leaderboardModel.currentBottomView.value;
    if (targetId > 0) {
      localStorage.setItem(SCROLL_POSITION_KEY, String(targetId));
    }
  });

  isBigScreenSignal.value = isBigScreen ?? false;

  if (data.value == null) return null;

  return (
    <>
      <LeaderboardTable problems={data.value.contest.problems}>
        <LeaderboardRows />
      </LeaderboardTable>
      <ActiveExtensionsOverlay timeline={data.value} />
    </>
  );
}
