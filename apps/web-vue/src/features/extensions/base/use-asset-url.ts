import { onUnmounted, ref, watch } from "vue";

import { API_BASE_URL } from "@/lib/runtime-config";
import { getPreloadedAsset } from "@/utils/preload-assets";

/**
 * Resolves an asset id to a playable URL, preferring preloaded buffers
 * (object URLs). The watcher must track ONLY the asset id: writing `url`
 * or `hasError` inside a watcher that also reads them re-triggers the
 * watcher and loops forever under Vue's scheduler (unlike React effects,
 * which don't auto-subscribe to everything read).
 */
export function useAssetUrl(getAssetId: () => string) {
  const url = ref<string | null>(null);
  const hasError = ref(false);
  let objectUrl: string | null = null;

  function resolve() {
    hasError.value = false;
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    url.value = null;
    const assetId = getAssetId();
    if (!assetId) return;
    const buffer = getPreloadedAsset(assetId);
    if (buffer) {
      objectUrl = URL.createObjectURL(new Blob([buffer]));
      url.value = objectUrl;
      return;
    }
    url.value = `${API_BASE_URL}/assets/${assetId}`;
  }

  // Retry imperatively when an element fails to load: only worth retrying
  // if an evicted preloaded buffer produced a dead object URL. A plain
  // server URL that 404s latches the error instead of hot-looping on the
  // element's error events.
  function markError() {
    if (objectUrl) {
      resolve();
    } else {
      hasError.value = true;
    }
  }

  watch(getAssetId, resolve, { immediate: true });

  onUnmounted(() => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  });

  return { url, hasError, markError };
}
