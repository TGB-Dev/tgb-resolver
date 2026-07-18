import { computed } from "@preact/signals-react";

import { playbackSignal } from "@/models/playback-state";

/** Narrow, leaf-consumable views of `playbackSignal`. Reading these inside a
 *  tiny leaf component (via `useComputed` / `.value`) re-renders only that leaf,
 *  instead of subscribing a wide ancestor subtree to the whole playback object. */
export const currentEventIdSignal = computed(() => playbackSignal.value.currentEventId);

export const currentResolveEventIdSignal = computed(
  () => playbackSignal.value.currentResolveEventId,
);

export const playbackStatusSignal = computed(() => playbackSignal.value.status);
