import { INTERNAL_DRAG_MIME } from "@/features/assets-manager/assets-interaction-store";

export function getDroppedAssetId(
  dataTransfer: DataTransfer,
  isSelectable: (id: string) => boolean,
): string {
  try {
    const ids = JSON.parse(dataTransfer.getData(INTERNAL_DRAG_MIME));
    if (Array.isArray(ids)) {
      const id = ids.find(
        (candidate): candidate is string =>
          typeof candidate === "string" && isSelectable(candidate),
      );
      if (id) return id;
    }
  } catch {
    // Fall through to legacy drag payloads.
  }

  const customData = dataTransfer.getData("application/tgb-asset");
  if (customData) {
    try {
      const parsed = JSON.parse(customData);
      if (parsed && typeof parsed.id === "string" && isSelectable(parsed.id)) return parsed.id;
    } catch {
      // Ignore malformed legacy payloads.
    }
  }

  const text = dataTransfer.getData("text/plain").trim();
  return text && isSelectable(text) ? text : "";
}
