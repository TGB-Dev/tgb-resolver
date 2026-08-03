import type { CustomEvent, ShowFile, TimelineEvent } from "@tgb-resolver/realtime";
import {
  PlaybackStatus,
  ShowMessageType,
  ShowMode,
  ShowSource,
  TimelineEventType,
  TimelineMode,
} from "@tgb-resolver/realtime";
import { beforeEach, expect, test } from "vitest";

import { playbackModel } from "@/features/control/playback-model";
import { showModel } from "@/features/shared/show-model";

function makeShow(showVersion: number, events: TimelineEvent[]): ShowFile {
  return {
    schemaVersion: 1,
    showVersion,
    mode: ShowMode.EDITING,
    timelineMode: TimelineMode.RW,
    meta: { title: "t", source: ShowSource.MANUAL },
    contest: {
      durationSeconds: 0,
      freezeDurationSeconds: 0,
      problems: [],
      users: [],
      preFreezeSnapshot: [],
    },
    automation: {
      autoResolveEnabled: false,
      autoResolveSpeedMs: 3_000,
      fullAutoEnabled: false,
    },
    playback: { status: PlaybackStatus.IDLE, activeEventIds: [] },
    assets: { items: [] },
    timeline: events,
  };
}

function event(
  id: number,
  position: number,
  type: TimelineEventType.CUS = TimelineEventType.CUS,
): TimelineEvent {
  return {
    id,
    position,
    type,
    payload: { extId: `ext${id}`, extPayload: { key: "value" } },
  };
}

function resetStore(): void {
  showModel.hydrateFromSnapshot(makeShow(0, []));
}

beforeEach(() => {
  resetStore();
});

test("hydrate populates the indexed map and position-sorted ids", () => {
  showModel.hydrateFromSnapshot(makeShow(3, [event(1, 5), event(2, 1), event(3, 3)]));

  expect(showModel.dataVersion.value).toBe(3);
  expect(Object.keys(showModel.showEvents.value).length).toBe(3);
  expect(showModel.showOrderedIds.value).toEqual([2, 3, 1]);
});

test("applies a granular add when the version is the next one", () => {
  showModel.hydrateFromSnapshot(makeShow(1, [event(1, 1)]));

  const applied = showModel.tryApplyShowMessage({
    type: ShowMessageType.TimelineEventAdded,
    showVersion: 2,
    event: event(2, 2),
  });

  expect(applied).toBe(true);
  expect(showModel.dataVersion.value).toBe(2);
  expect(2 in showModel.showEvents.value).toBe(true);
  expect(showModel.showOrderedIds.value).toEqual([1, 2]);
});

test("applies a granular update in place without touching order", () => {
  showModel.hydrateFromSnapshot(makeShow(1, [event(1, 1), event(2, 2)]));

  const applied = showModel.tryApplyShowMessage({
    type: ShowMessageType.TimelineEventUpdated,
    showVersion: 2,
    event: {
      id: 1,
      position: 1,
      type: TimelineEventType.CUS,
      payload: { extId: "updated", extPayload: { key: "value" } },
    },
  });

  expect(applied).toBe(true);
  expect(showModel.dataVersion.value).toBe(2);
  expect((showModel.showEvents.value[1] as CustomEvent).payload.extId).toBe("updated");
  expect(showModel.showOrderedIds.value).toEqual([1, 2]);
});

test("applies a granular remove", () => {
  showModel.hydrateFromSnapshot(makeShow(1, [event(1, 1), event(2, 2)]));

  const applied = showModel.tryApplyShowMessage({
    type: ShowMessageType.TimelineEventRemoved,
    showVersion: 2,
    eventId: 1,
  });

  expect(applied).toBe(true);
  expect(1 in showModel.showEvents.value).toBe(false);
  expect(showModel.showOrderedIds.value).toEqual([2]);
});

test("applies a reorder from the server's authoritative id list", () => {
  showModel.hydrateFromSnapshot(makeShow(2, [event(1, 1), event(2, 2), event(3, 3)]));

  const applied = showModel.tryApplyShowMessage({
    type: ShowMessageType.TimelineReordered,
    showVersion: 3,
    orderedEventIds: [3, 1, 2],
  });

  expect(applied).toBe(true);
  expect(showModel.showOrderedIds.value).toEqual([3, 1, 2]);
});

test("optimistically reorders rows with updated positions and rolls back the snapshot", () => {
  showModel.hydrateFromSnapshot(makeShow(2, [event(1, 1), event(2, 2), event(3, 3)]));

  const snapshot = showModel.optimisticallyReorderTimeline([3, 1, 2]);

  expect(showModel.showOrderedIds.value).toEqual([3, 1, 2]);
  expect(showModel.rows.value.map((row) => row.position)).toEqual([1, 2, 3]);

  showModel.restoreTimelineOrder(snapshot);

  expect(showModel.showOrderedIds.value).toEqual([1, 2, 3]);
  expect(showModel.rows.value.map((row) => row.position)).toEqual([1, 2, 3]);
});

test("does not roll back an optimistic reorder after an authoritative reorder arrives", () => {
  showModel.hydrateFromSnapshot(makeShow(2, [event(1, 1), event(2, 2), event(3, 3)]));

  const snapshot = showModel.optimisticallyReorderTimeline([3, 1, 2]);
  showModel.tryApplyShowMessage({
    type: ShowMessageType.TimelineReordered,
    showVersion: 3,
    orderedEventIds: [2, 3, 1],
  });

  const restored = showModel.restoreTimelineOrderIfCurrent(snapshot, [3, 1, 2]);

  expect(restored).toBe(false);
  expect(showModel.showOrderedIds.value).toEqual([2, 3, 1]);
});

test("rejects an out-of-order diff and reports the gap for repair-refetch", () => {
  showModel.hydrateFromSnapshot(makeShow(1, [event(1, 1)]));

  const applied = showModel.tryApplyShowMessage({
    type: ShowMessageType.TimelineEventAdded,
    showVersion: 9,
    event: event(99, 99),
  });

  expect(applied).toBe(false);
  expect(showModel.dataVersion.value).toBe(1);
  expect(99 in showModel.showEvents.value).toBe(false);
});

test("rows folds the store into table items in order", () => {
  showModel.hydrateFromSnapshot(makeShow(1, [event(1, 5), event(2, 1), event(3, 3)]));

  const rows = showModel.rows.value;
  expect(rows).toHaveLength(3);
  expect(rows.map((r) => r.id)).toEqual([2, 3, 1]);
});

test("rows does not recompute when only playback changes", () => {
  showModel.hydrateFromSnapshot(makeShow(1, [event(1, 1), event(2, 2)]));

  const before = showModel.rows.value;

  // Simulate a playback tick (current event advances) without any show-data edit.
  playbackModel.update({ currentEventId: 2 });

  const after = showModel.rows.value;
  // Same array reference => the table body does not re-render on a tick.
  expect(after).toBe(before);
  // Rows carry no playback-derived current flags anymore.
  expect(after.every((r) => !r.isActive)).toBe(true);
});
