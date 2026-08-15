import type { ScrollerExtensionPayload } from "./index";

/**
 * Total wall-clock duration of the scroller animation: a fixed 1-second ease
 * back to the top, followed by the operator-configured downward scroll.
 */
export function computeScrollerExtensionDuration(payload: ScrollerExtensionPayload): number {
  const downwardSeconds = typeof payload.duration === "number" ? payload.duration : 10;
  return 1 + downwardSeconds;
}
