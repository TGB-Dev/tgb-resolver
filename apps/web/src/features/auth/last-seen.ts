export const ONLINE_GRACE_MS = 10_000;

function shortTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

export function formatLastSeen(online: boolean, lastSeenIso: string, nowMs = Date.now()): string {
  const seen = Date.parse(lastSeenIso);
  if (online) return "now";
  if (!Number.isNaN(seen) && nowMs - seen < ONLINE_GRACE_MS) return "now";
  return shortTime(lastSeenIso);
}
