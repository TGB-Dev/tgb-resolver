import type { ShowMetaSnapshot } from "@tgb-resolver/contracts";
import type { ShowFile, TimelineEvent, TimelineTableItem } from "@tgb-resolver/realtime";
import {
  PlaybackStatus,
  SHOW_SCHEMA_VERSION,
  ShowMessageType,
  ShowMode,
  ShowSource,
  TimelineMode,
  toTimelineTableItem,
  toTimelineTableItems,
} from "@tgb-resolver/realtime";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

interface ShowDerivedContext {
  problems: ShowFile["contest"]["problems"];
  users: ShowFile["contest"]["users"];
  preFreezeSnapshot: ShowFile["contest"]["preFreezeSnapshot"];
  autoResolveSpeedMs: number;
}

interface TimelineOrderSnapshot {
  events: Record<number, TimelineEvent>;
  orderedIds: number[];
}

function hasSameTimelineEventContent(
  previous: TimelineEvent | undefined,
  next: TimelineEvent,
): boolean {
  if (!previous || previous.type !== next.type) return false;

  const { position: _previousPosition, ...previousContent } = previous;
  const { position: _nextPosition, ...nextContent } = next;
  return JSON.stringify(previousContent) === JSON.stringify(nextContent);
}

function hasSameIds(previous: readonly number[], next: readonly number[]): boolean {
  if (previous.length !== next.length) return false;
  return previous.every((id, index) => id === next[index]);
}

function hasSameTimelineEvents(
  previous: Record<number, TimelineEvent>,
  next: Record<number, TimelineEvent>,
): boolean {
  const previousKeys = Object.keys(previous);
  if (previousKeys.length !== Object.keys(next).length) return false;
  return previousKeys.every(
    (key) =>
      key in next &&
      hasSameTimelineEventContent(previous[Number(key)], next[Number(key)] as TimelineEvent),
  );
}

function hasSameDerivedContext(
  previous: ShowDerivedContext | null,
  next: ShowDerivedContext,
): boolean {
  return previous != null && JSON.stringify(previous) === JSON.stringify(next);
}

export type ShowMessage =
  | { type: ShowMessageType.TimelineEventAdded; showVersion: number; event: TimelineEvent }
  | { type: ShowMessageType.TimelineEventUpdated; showVersion: number; event: TimelineEvent }
  | { type: ShowMessageType.TimelineEventRemoved; showVersion: number; eventId: number }
  | { type: ShowMessageType.TimelineReordered; showVersion: number; orderedEventIds: number[] };

export const useShowStore = defineStore("show", () => {
  const showEvents = ref<Record<number, TimelineEvent>>({});
  const showOrderedIds = ref<number[]>([]);
  const showContext = ref<ShowDerivedContext | null>(null);
  const showMode = ref<ShowMode>(ShowMode.EDITING);
  const dataVersion = ref<number>(0);
  const showMeta = ref<ShowMetaSnapshot | undefined>(undefined);
  const showFile = ref<ShowFile | null>(null);

  let cachedTimelineItemContext: ShowDerivedContext | null = null;
  let cachedTimelineItemEvents: Record<number, TimelineEvent> = {};
  let cachedTimelineItemsById: Record<number, TimelineTableItem> = {};

  const timelineItemsById = computed<Record<number, TimelineTableItem>>(() => {
    const ctx = showContext.value;
    const events = showEvents.value;
    if (!ctx) return {};

    const userById = Object.fromEntries(ctx.users.map((user) => [user.id, user] as const));
    const problemById = Object.fromEntries(
      ctx.problems.map((problem) => [problem.id, problem] as const),
    );
    const next: Record<number, TimelineTableItem> = {};
    for (const [id, event] of Object.entries(events)) {
      const eventId = Number(id);
      const cachedItem = cachedTimelineItemsById[eventId];
      next[eventId] =
        cachedTimelineItemContext === ctx &&
        hasSameTimelineEventContent(cachedTimelineItemEvents[eventId], event) &&
        cachedItem
          ? cachedItem
          : toTimelineTableItem(event, undefined, ctx.autoResolveSpeedMs, userById, problemById);
    }

    cachedTimelineItemContext = ctx;
    cachedTimelineItemEvents = events;
    cachedTimelineItemsById = next;
    return next;
  });

  const rows = computed<TimelineTableItem[]>(() => {
    const ctx = showContext.value;
    const events = showOrderedIds.value.map((id, index) => {
      const event = showEvents.value[id];
      return event && { ...event, position: index + 1 };
    });
    if (!ctx || events.some((e) => e == null)) return [];
    const built = toTimelineTableItems({
      schemaVersion: SHOW_SCHEMA_VERSION,
      showVersion: 0,
      mode: showMode.value,
      timelineMode: TimelineMode.RW,
      meta: { title: "", source: ShowSource.MANUAL },
      contest: {
        durationSeconds: 0,
        freezeDurationSeconds: 0,
        problems: ctx.problems,
        users: ctx.users,
        preFreezeSnapshot: ctx.preFreezeSnapshot,
      },
      automation: {
        autoResolveEnabled: false,
        autoResolveSpeedMs: ctx.autoResolveSpeedMs,
        fullAutoEnabled: false,
      },
      playback: { status: PlaybackStatus.IDLE, activeEventIds: [] },
      assets: { items: [] },
      timeline: events as TimelineEvent[],
    });
    return built;
  });

  function applyTimelineOrder(orderedIds: number[]): void {
    if (hasSameIds(showOrderedIds.value, orderedIds)) return;
    showOrderedIds.value = orderedIds;
  }

  function optimisticallyReorderTimeline(orderedIds: number[]): TimelineOrderSnapshot {
    const snapshot = { events: showEvents.value, orderedIds: showOrderedIds.value };
    applyTimelineOrder(orderedIds);
    return snapshot;
  }

  function restoreTimelineOrder(snapshot: TimelineOrderSnapshot): void {
    showEvents.value = snapshot.events;
    showOrderedIds.value = snapshot.orderedIds;
  }

  function restoreTimelineOrderIfCurrent(
    snapshot: TimelineOrderSnapshot,
    expectedOrderedIds: number[],
  ): boolean {
    if (
      showOrderedIds.value.length !== expectedOrderedIds.length ||
      showOrderedIds.value.some((id, index) => id !== expectedOrderedIds[index])
    ) {
      return false;
    }
    restoreTimelineOrder(snapshot);
    return true;
  }

  function hydrateFromSnapshot(show: ShowFile): void {
    showFile.value = show;
    const map = Object.fromEntries(
      (show.timeline ?? []).map((event) => [event.id, event] as const),
    );
    const ids = Object.keys(map)
      .map(Number)
      .sort((a, b) => (map[a]?.position ?? 0) - (map[b]?.position ?? 0));
    // Skip writes that would hand fresh identities to unchanged data: a big
    // refetch (version gap / reconnect) with no edits must not rebuild the
    // events map or ids array, which would re-derive every table row.
    if (!hasSameTimelineEvents(showEvents.value, map)) {
      showEvents.value = map;
    }
    if (!hasSameIds(showOrderedIds.value, ids)) {
      showOrderedIds.value = ids;
    }
    const nextContext = {
      problems: show.contest?.problems ?? [],
      users: show.contest?.users ?? [],
      preFreezeSnapshot: show.contest?.preFreezeSnapshot ?? [],
      autoResolveSpeedMs: show.automation?.autoResolveSpeedMs ?? 3_000,
    };
    const previousContext = showContext.value;
    if (!hasSameDerivedContext(previousContext, nextContext)) {
      showContext.value = nextContext;
    }
    showMode.value = show.mode;
    dataVersion.value = show.showVersion;
    showMeta.value = show.meta;
  }

  function tryAdvanceShowVersion(showVersion: number): boolean {
    if (showVersion !== dataVersion.value + 1) return false;
    dataVersion.value = showVersion;
    return true;
  }

  function tryApplyShowMessage(message: ShowMessage): boolean {
    if (!tryAdvanceShowVersion(message.showVersion)) return false;
    switch (message.type) {
      case ShowMessageType.TimelineEventAdded:
      case ShowMessageType.TimelineEventUpdated: {
        const next = { ...showEvents.value, [message.event.id]: message.event };
        showEvents.value = next;
        if (!showOrderedIds.value.includes(message.event.id)) {
          const orderedIds = showOrderedIds.value;
          const insertAt = Math.min(Math.max(message.event.position - 1, 0), orderedIds.length);
          showOrderedIds.value = [
            ...orderedIds.slice(0, insertAt),
            message.event.id,
            ...orderedIds.slice(insertAt),
          ];
        }
        break;
      }
      case ShowMessageType.TimelineEventRemoved: {
        const { [message.eventId]: _, ...next } = showEvents.value;
        showEvents.value = next;
        showOrderedIds.value = showOrderedIds.value.filter((id) => id !== message.eventId);
        break;
      }
      case ShowMessageType.TimelineReordered:
        applyTimelineOrder(message.orderedEventIds);
        break;
    }
    return true;
  }

  return {
    showEvents,
    showOrderedIds,
    showMode,
    dataVersion,
    showMeta,
    showFile,
    rows,
    timelineItemsById,
    hydrateFromSnapshot,
    tryAdvanceShowVersion,
    optimisticallyReorderTimeline,
    restoreTimelineOrder,
    restoreTimelineOrderIfCurrent,
    tryApplyShowMessage,
  };
});
