import {
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
  ShowMessageType,
  ShowMode,
  ShowSource,
  TimelineMode,
  toTimelineTableItems,
} from "@tgb-resolver/realtime";

interface ShowDerivedContext {
  problems: ShowFile["contest"]["problems"];
  users: ShowFile["contest"]["users"];
  preFreezeSnapshot: ShowFile["contest"]["preFreezeSnapshot"];
  autoResolveSpeedMs: number;
}

interface ShowModelState {
  showEvents: Signal<Record<number, TimelineEvent>>;
  showOrderedIds: Signal<number[]>;
  showMode: Signal<ShowMode>;
  dataVersion: Signal<number>;
  showMeta: Signal<ShowMetaSnapshot | undefined>;
  showFile: Signal<ShowFile | null>;
  rows: ReadonlySignal<TimelineTableItem[]>;
  hydrateFromSnapshot: (show: ShowFile) => void;
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

  const rows = computed<TimelineTableItem[]>(() => {
    const ctx = showContext.value;
    const events = showOrderedIds.value.map((id) => showEvents.value[id]);
    if (!ctx || events.some((e) => e == null)) return [];
    const built = toTimelineTableItems({
      schemaVersion: 1,
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
    showContext.value = {
      problems: show.contest?.problems ?? [],
      users: show.contest?.users ?? [],
      preFreezeSnapshot: show.contest?.preFreezeSnapshot ?? [],
      autoResolveSpeedMs: show.automation?.autoResolveSpeedMs ?? 3_000,
    };
    showMode.value = show.mode;
    dataVersion.value = show.showVersion;
    showMeta.value = show.meta;
  }

  function tryApplyShowMessage(
    message:
      | { type: ShowMessageType.TimelineEventAdded; showVersion: number; event: TimelineEvent }
      | { type: ShowMessageType.TimelineEventUpdated; showVersion: number; event: TimelineEvent }
      | { type: ShowMessageType.TimelineEventRemoved; showVersion: number; eventId: number }
      | { type: ShowMessageType.TimelineReordered; showVersion: number; orderedEventIds: number[] },
  ): boolean {
    if (message.showVersion !== dataVersion.value + 1) return false;
    switch (message.type) {
      case ShowMessageType.TimelineEventAdded:
      case ShowMessageType.TimelineEventUpdated: {
        const next = { ...showEvents.value, [message.event.id]: message.event };
        showEvents.value = next;
        if (!showOrderedIds.value.includes(message.event.id)) {
          showOrderedIds.value = [...showOrderedIds.value, message.event.id].sort(
            (a, b) => (next[a]?.position ?? 0) - (next[b]?.position ?? 0),
          );
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
        showOrderedIds.value = [...message.orderedEventIds];
        break;
    }
    dataVersion.value = message.showVersion;
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
    hydrateFromSnapshot,
    tryApplyShowMessage,
  };
});

export const showModel = new ShowModel();
