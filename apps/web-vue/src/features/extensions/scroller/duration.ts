export interface ScrollerExtensionPayload extends Record<string, unknown> {
  duration?: number;
}
export function computeScrollerExtensionDuration(payload: ScrollerExtensionPayload) {
  return 1 + (typeof payload.duration === "number" ? payload.duration : 10);
}
