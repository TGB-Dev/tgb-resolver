import {
  batch,
  computed,
  createModel,
  type ReadonlySignal,
  type Signal,
  signal,
} from "@preact/signals-react";
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

function hasSameDerivedContext(
  previous: ShowDerivedContext | null,
  next: ShowDerivedContext,
): boolean {
  return previous != null && JSON.stringify(previous) === JSON.stringify(next);
}

interface ShowModelState {
  showEvents: Signal<Record<number, TimelineEvent>>;
  showOrderedIds: Signal<number[]>;
  showMode: Signal<ShowMode>;
  dataVersion: Signal<number>;
  showMeta: Signal<ShowMetaSnapshot | undefined>;
  showFile: Signal<ShowFile | null>;
  rows: ReadonlySignal<TimelineTableItem[]>;
  timelineItemsById: ReadonlySignal<Record<number, TimelineTableItem>>;
  hydrateFromSnapshot: (show: ShowFile) => void;
  tryAdvanceShowVersion: (showVersion: number) => boolean;
  optimisticallyReorderTimeline: (orderedIds: number[]) => TimelineOrderSnapshot;
  restoreTimelineOrder: (snapshot: TimelineOrderSnapshot) => void;
  restoreTimelineOrderIfCurrent: (
    snapshot: TimelineOrderSnapshot,
    expectedOrderedIds: number[],
  ) => boolean;
  tryApplyShowMessage: (
    message:
      | { type: ShowMessageType.TimelineEventAdded; showVersion: number; event: TimelineEvent }
      | { type: ShowMessageType.TimelineEventUpdated; showVersion: number; event: TimelineEvent }
      | { type: ShowMessageType.TimelineEventRemoved; showVersion: number; eventId: number }
      | { type: ShowMessageType.TimelineReordered; showVersion: number; orderedEventIds: number[] },
  ) => boolean;
}

const ShowModel = createModel<ShowModelState>(() => {
  const showEvents = signal<Record<number, TimelineEvent>>({});
  const showOrderedIds = signal<number[]>([]);
  const showContext = signal<ShowDerivedContext | null>(null);
  const showMode = signal<ShowMode>(ShowMode.EDITING);
  const dataVersion = signal<number>(0);
  const showMeta = signal<ShowMetaSnapshot | undefined>(undefined);
  const showFile = signal<ShowFile | null>(null);

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
    showOrderedIds.value = orderedIds;
  }

  function optimisticallyReorderTimeline(orderedIds: number[]): TimelineOrderSnapshot {
    const snapshot = { events: showEvents.value, orderedIds: showOrderedIds.value };
    applyTimelineOrder(orderedIds);
    return snapshot;
  }

  function restoreTimelineOrder(snapshot: TimelineOrderSnapshot): void {
    batch(() => {
      showEvents.value = snapshot.events;
      showOrderedIds.value = snapshot.orderedIds;
    });
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
    showEvents.value = map;
    showOrderedIds.value = ids;
    const nextContext = {
      problems: show.contest?.problems ?? [],
      users: show.contest?.users ?? [],
      preFreezeSnapshot: show.contest?.preFreezeSnapshot ?? [],
      autoResolveSpeedMs: show.automation?.autoResolveSpeedMs ?? 3_000,
    };
    const previousContext = showContext.peek();
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

  function tryApplyShowMessage(
    message:
      | { type: ShowMessageType.TimelineEventAdded; showVersion: number; event: TimelineEvent }
      | { type: ShowMessageType.TimelineEventUpdated; showVersion: number; event: TimelineEvent }
      | { type: ShowMessageType.TimelineEventRemoved; showVersion: number; eventId: number }
      | { type: ShowMessageType.TimelineReordered; showVersion: number; orderedEventIds: number[] },
  ): boolean {
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

export const showModel = new ShowModel();
