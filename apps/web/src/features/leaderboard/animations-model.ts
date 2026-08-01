import {
  computed,
  createModel,
  type ReadonlySignal,
  type Signal,
  signal,
} from "@preact/signals-react";

import { playbackModel } from "@/features/control/playback-model";
import { showModel } from "@/features/shared/show-model";

export const SEEK_EVENTS_ANIM_THRESHOLD = 10;

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

interface AnimationsModelState {
  previousEventId: Signal<number | null>;
  skipNumberAnimations: ReadonlySignal<boolean>;
  reset: () => void;
}

const AnimationsModel = createModel<AnimationsModelState>(() => {
  const previousEventId = signal<number | null>(null);

  const skipNumberAnimations = computed(() =>
    shouldSkipSeek(
      showModel.showOrderedIds.value,
      previousEventId.value,
      playbackModel.currentEventId.value,
    ),
  );

  function reset() {
    previousEventId.value = null;
  }

  return { previousEventId, skipNumberAnimations, reset };
});

export const animationsModel = new AnimationsModel();
