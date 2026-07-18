import type { PlaySfxEvent, ShowFile, TimelineEvent } from "@tgb-resolver/realtime";
import {
  PlaybackStatus,
  ShowMessageType,
  ShowMode,
  ShowSource,
  TimelineEventType,
  TimelineMode,
} from "@tgb-resolver/realtime";
import { beforeEach, expect, test } from "vitest";

import { playbackSignal } from "@/models/playback-state";

import {
  dataVersion,
  hydrateShowFromSnapshot,
  rowsSignal,
  showEvents,
  showOrderedIds,
  tryApplyShowMessage,
} from "./show-store";

function makeShow(showVersion: number, events: TimelineEvent[]): ShowFile {
  return {
    schemaVersion: 1,
    showVersion,
    mode: ShowMode.EDITING,
    timelineMode: TimelineMode.RW,
    meta: { title: "t", source: ShowSource.MANUAL },
    contest: { durationSeconds: 0, freezeDurationSeconds: 0, preFreezeSnapshot: [] },
    automation: {
      autoResolveEnabled: false,
      autoResolveSpeedMs: 3_000,
      fullAutoEnabled: false,
    },
    playback: { status: PlaybackStatus.IDLE, executionSequence: 0 },
    assets: { images: [], sfx: [] },
    timeline: events,
  };
}

function event(
  id: number,
  position: number,
  type: TimelineEventType.SFX = TimelineEventType.SFX,
): TimelineEvent {
  return {
    id,
    position,
    type,
    payload: { sfxId: `s${id}`, durationSeconds: 1 },
  };
}

function resetStore(): void {
  hydrateShowFromSnapshot(makeShow(0, []));
}

beforeEach(() => {
  resetStore();
});

test("hydrate populates the indexed map and position-sorted ids", () => {
  hydrateShowFromSnapshot(makeShow(3, [event(1, 5), event(2, 1), event(3, 3)]));

  expect(dataVersion.value).toBe(3);
  expect(showEvents.value.size).toBe(3);
  expect(showOrderedIds.value).toEqual([2, 3, 1]);
});

test("applies a granular add when the version is the next one", () => {
  hydrateShowFromSnapshot(makeShow(1, [event(1, 1)]));

  const applied = tryApplyShowMessage({
    type: ShowMessageType.TimelineEventAdded,
    showVersion: 2,
    event: event(2, 2),
  });

  expect(applied).toBe(true);
  expect(dataVersion.value).toBe(2);
  expect(showEvents.value.has(2)).toBe(true);
  expect(showOrderedIds.value).toEqual([1, 2]);
});

test("applies a granular update in place without touching order", () => {
  hydrateShowFromSnapshot(makeShow(1, [event(1, 1), event(2, 2)]));

  const applied = tryApplyShowMessage({
    type: ShowMessageType.TimelineEventUpdated,
    showVersion: 2,
    event: {
      id: 1,
      position: 1,
      type: TimelineEventType.SFX,
      payload: { sfxId: "updated", durationSeconds: 9 },
    },
  });

  expect(applied).toBe(true);
  expect(dataVersion.value).toBe(2);
  expect((showEvents.value.get(1) as PlaySfxEvent).payload.sfxId).toBe("updated");
  expect(showOrderedIds.value).toEqual([1, 2]);
});

test("applies a granular remove", () => {
  hydrateShowFromSnapshot(makeShow(1, [event(1, 1), event(2, 2)]));

  const applied = tryApplyShowMessage({
    type: ShowMessageType.TimelineEventRemoved,
    showVersion: 2,
    eventId: 1,
  });

  expect(applied).toBe(true);
  expect(showEvents.value.has(1)).toBe(false);
  expect(showOrderedIds.value).toEqual([2]);
});

test("applies a reorder from the server's authoritative id list", () => {
  hydrateShowFromSnapshot(makeShow(2, [event(1, 1), event(2, 2), event(3, 3)]));

  const applied = tryApplyShowMessage({
    type: ShowMessageType.TimelineReordered,
    showVersion: 3,
    orderedEventIds: [3, 1, 2],
  });

  expect(applied).toBe(true);
  expect(showOrderedIds.value).toEqual([3, 1, 2]);
});

test("rejects an out-of-order diff and reports the gap for repair-refetch", () => {
  hydrateShowFromSnapshot(makeShow(1, [event(1, 1)]));

  const applied = tryApplyShowMessage({
    type: ShowMessageType.TimelineEventAdded,
    showVersion: 9,
    event: event(99, 99),
  });

  expect(applied).toBe(false);
  expect(dataVersion.value).toBe(1);
  expect(showEvents.value.has(99)).toBe(false);
});

test("rowsSignal folds the store into table items in order", () => {
  hydrateShowFromSnapshot(makeShow(1, [event(1, 5), event(2, 1), event(3, 3)]));

  const rows = rowsSignal.value;
  expect(rows).toHaveLength(3);
  expect(rows.map((r) => r.id)).toEqual([2, 3, 1]);
});

test("rowsSignal does not recompute when only playback changes", () => {
  hydrateShowFromSnapshot(makeShow(1, [event(1, 1), event(2, 2)]));

  const before = rowsSignal.value;

  // Simulate a playback tick (current event advances) without any show-data edit.
  playbackSignal.value = { ...playbackSignal.value, currentEventId: 2 };

  const after = rowsSignal.value;
  // Same array reference => the table body does not re-render on a tick.
  expect(after).toBe(before);
  // Rows carry no playback-derived current flags anymore.
  expect(after.every((r) => !r.isCurrentResolve && !r.isCurrentInlineEvent)).toBe(true);
});
