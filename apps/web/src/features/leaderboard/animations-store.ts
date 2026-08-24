import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { usePlaybackStore } from "@/features/control/playback-store";
import { useShowStore } from "@/stores/show-store";

const SEEK_EVENTS_ANIM_THRESHOLD = 10;

export function shouldSkipSeek(
  orderedEventIds: readonly number[],
  fromEventId: number | null,
  toEventId: number | null,
  threshold: number = SEEK_EVENTS_ANIM_THRESHOLD,
): boolean {
  if (fromEventId == null) return false;
  if (toEventId == null) return true;
  const from = orderedEventIds.indexOf(fromEventId);
  const to = orderedEventIds.indexOf(toEventId);
  if (from < 0 || to < 0) return false;
  return Math.abs(from - to) >= threshold;
}

export const useAnimationsStore = defineStore("animations", () => {
  const previousEventId = ref<number | null>(null);

  const skipNumberAnimations = computed(() =>
    shouldSkipSeek(
      useShowStore().showOrderedIds,
      previousEventId.value,
      usePlaybackStore().currentEventId,
    ),
  );

  function reset() {
    previousEventId.value = null;
  }

  return { previousEventId, skipNumberAnimations, reset };
});
