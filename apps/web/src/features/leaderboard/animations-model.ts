export const SEEK_EVENTS_ANIM_THRESHOLD = 10;

export function shouldSkipSeek(
  orderedEventIds: readonly number[],
  fromEventId: number | null,
  toEventId: number | null,
  threshold: number = SEEK_EVENTS_ANIM_THRESHOLD,
): boolean {
  if (toEventId == null) return true;
  if (fromEventId == null) return false;
  const from = orderedEventIds.indexOf(fromEventId);
  const to = orderedEventIds.indexOf(toEventId);
  if (from < 0 || to < 0) return false;
  return Math.abs(from - to) >= threshold;
}
