import { useWakeLock } from "@vueuse/core";
import { type MaybeRefOrGetter, toValue, watch } from "vue";

import { useControlIsLive } from "@/features/control/composables/use-show";

/**
 * Keeps the screen awake while the show is in LIVE mode and releases the
 * lock when switching back to edit/idle. No-op on browsers without the
 * Screen Wake Lock API.
 */
export function useLiveWakeLock(isLive: MaybeRefOrGetter<boolean> = useControlIsLive()) {
  const { request, release } = useWakeLock();

  watch(
    () => toValue(isLive),
    (live) => {
      if (live) {
        void request("screen");
      } else {
        void release();
      }
    },
    { immediate: true },
  );
}
