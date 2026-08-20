export function patchExtensionPayload(
  payload: Record<string, unknown>,
  patch: Record<string, unknown>,
) {
  return { ...payload, ...patch };
}
