import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";

function cuePriority(type: TimelineEventType): number {
  if (type === TimelineEventType.RES) return 0;
  if (type === TimelineEventType.PRE) return 1;
  return 2;
}

export function currentCue(
  rows: TimelineTableItem[],
  currentEventId: number | null,
  currentResolveEventId: number | null,
): TimelineTableItem | undefined {
  if (currentEventId == null) return undefined;
  const currentIndex = rows.findIndex((row) => row.id === currentEventId);
  if (currentIndex < 0) return undefined;
  const current = rows[currentIndex];
  // On concurrent plays, prefer RES/PRE. The reliable current event (resolved via
  // currentEventId) is always included; flag-staleness is avoided by only
  // considering playing events adjacent (±1) to it.
  const concurrent = rows.filter(
    (row) =>
      (row.id === currentResolveEventId || row.id === currentEventId) &&
      row.id !== current.id &&
      Math.abs(rows.indexOf(row) - currentIndex) <= 1,
  );
  if (concurrent.length === 0) return current;
  return [current, ...concurrent].sort((a, b) => cuePriority(a.type) - cuePriority(b.type))[0];
}
