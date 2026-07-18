import { computed, type ReadonlySignal, signal } from "@preact/signals-react";
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
  preFreezeSnapshot: ShowFile["contest"]["preFreezeSnapshot"];
  autoResolveSpeedMs: number;
}

export const showEvents = signal<Map<number, TimelineEvent>>(new Map());
export const showOrderedIds = signal<number[]>([]);
export const showContext = signal<ShowDerivedContext | null>(null);
export const showMode = signal<ShowMode>(ShowMode.EDITING);
export const dataVersion = signal<number>(0);
export const showMeta = signal<ShowMetaSnapshot>();

export function hydrateShowFromSnapshot(show: ShowFile): void {
  const map = new Map<number, TimelineEvent>();
  for (const event of show.timeline ?? []) {
    map.set(event.id, event);
  }
  const ids = [...map.keys()].sort(
    (a, b) => (map.get(a)?.position ?? 0) - (map.get(b)?.position ?? 0),
  );
  showEvents.value = map;
  showOrderedIds.value = ids;
  showContext.value = {
    preFreezeSnapshot: show.contest?.preFreezeSnapshot ?? [],
    autoResolveSpeedMs: show.automation?.autoResolveSpeedMs ?? 3_000,
  };
  showMode.value = show.mode;
  dataVersion.value = show.showVersion;
  showMeta.value = show.meta;
}

function applyTimelineEvent(event: TimelineEvent): void {
  const next = new Map(showEvents.value);
  next.set(event.id, event);
  showEvents.value = next;
  if (!showOrderedIds.value.includes(event.id)) {
    const ids = [...showOrderedIds.value, event.id].sort(
      (a, b) => (next.get(a)?.position ?? 0) - (next.get(b)?.position ?? 0),
    );
    showOrderedIds.value = ids;
  }
}

function removeTimelineEvent(eventId: number): void {
  const next = new Map(showEvents.value);
  next.delete(eventId);
  showEvents.value = next;
  showOrderedIds.value = showOrderedIds.value.filter((id) => id !== eventId);
}

function reorderTimeline(orderedEventIds: number[]): void {
  // The server's id list is the authoritative order; trust it verbatim.
  showOrderedIds.value = [...orderedEventIds];
}

export function tryApplyShowMessage(
  message:
    | { type: ShowMessageType.TimelineEventAdded; showVersion: number; event: TimelineEvent }
    | { type: ShowMessageType.TimelineEventUpdated; showVersion: number; event: TimelineEvent }
    | { type: ShowMessageType.TimelineEventRemoved; showVersion: number; eventId: number }
    | { type: ShowMessageType.TimelineReordered; showVersion: number; orderedEventIds: number[] },
): boolean {
  // Original desync design: only apply when this is exactly the next version.
  // A gap (missed message / late join) returns false so the caller can repair-refetch.
  if (message.showVersion !== dataVersion.value + 1) return false;

  switch (message.type) {
    case ShowMessageType.TimelineEventAdded:
    case ShowMessageType.TimelineEventUpdated:
      applyTimelineEvent(message.event);
      break;
    case ShowMessageType.TimelineEventRemoved:
      removeTimelineEvent(message.eventId);
      break;
    case ShowMessageType.TimelineReordered:
      reorderTimeline(message.orderedEventIds);
      break;
  }
  dataVersion.value = message.showVersion;
  return true;
}

// Fold events -> TimelineTableItem[] with reference preservation so memo'd rows
// skip re-render when their derived content is unchanged.
const rowIdentityCache = new Map<number, { hash: number; row: TimelineTableItem }>();

// TODO: find a more efficient way to accomplish this
function hashTimelineRow(row: TimelineTableItem): number {
  let h = 0x811c9dc5;
  for (const value of Object.values(row)) {
    if (typeof value === "string") {
      for (let i = 0; i < value.length; i++) {
        h ^= value.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
      }
    } else if (typeof value === "number") {
      h = Math.imul(h ^ (value & 0xffff), 0x01000193);
      h = Math.imul(h ^ (value >>> 16), 0x01000193);
    } else if (value != null) {
      h = Math.imul(h ^ 1, 0x01000193);
    }
  }
  return h >>> 0;
}

export const rowsSignal: ReadonlySignal<TimelineTableItem[]> = computed(() => {
  const ctx = showContext.value;
  const events = showOrderedIds.value.map((id) => showEvents.value.get(id));
  if (!ctx || events.some((e) => e == null)) return [];

  const rows = toTimelineTableItems({
    schemaVersion: 1,
    showVersion: 0,
    mode: showMode.value,
    timelineMode: TimelineMode.RW,
    meta: { title: "", source: ShowSource.MANUAL },
    contest: {
      durationSeconds: 0,
      freezeDurationSeconds: 0,
      preFreezeSnapshot: ctx.preFreezeSnapshot,
    },
    automation: {
      autoResolveEnabled: false,
      autoResolveSpeedMs: ctx.autoResolveSpeedMs,
      fullAutoEnabled: false,
    },
    // Playback-derived "current" state is NOT folded in here anymore. It is
    // derived per-row in leaf components from `currentEventIdSignal` /
    // `currentResolveEventIdSignal`, so a playback tick no longer re-runs this
    // fold or re-renders every `rowsSignal` consumer.
    playback: { status: PlaybackStatus.IDLE, executionSequence: 0 },
    assets: { images: [], sfx: [] },
    timeline: events as TimelineEvent[],
  });

  return rows.map((row) => {
    const hash = hashTimelineRow(row);
    const prev = rowIdentityCache.get(row.id);
    if (prev && prev.hash === hash) return prev.row;
    rowIdentityCache.set(row.id, { hash, row });
    return row;
  });
});
