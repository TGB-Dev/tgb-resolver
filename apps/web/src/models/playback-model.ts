import {
  computed,
  createModel,
  type ReadonlySignal,
  type Signal,
  signal,
} from "@preact/signals-react";
import type { PlaybackStateSnapshot } from "@tgb-resolver/contracts";

export interface ActiveSegmentState {
  resolveEventId: number;
  nextResolveEventId: number | null;
  inlineEventIds: number[];
  currentInlineIndex: number;
}

export interface PlaybackState {
  showVersion: number;
  status: string | null;
  executionSequence: number | null;
  currentResolveEventId: number | null;
  currentEventId: number | null;
  activeSegment: ActiveSegmentState | null;
  startedAt: number | null;
}

const defaultPlayback: PlaybackState = {
  showVersion: 0,
  status: "Idle",
  executionSequence: 0,
  currentResolveEventId: null,
  currentEventId: null,
  activeSegment: null,
  startedAt: null,
};

interface PlaybackModelState {
  state: Signal<PlaybackState>;
  currentEventId: ReadonlySignal<number | null>;
  currentCueId: ReadonlySignal<number | null>;
  status: ReadonlySignal<string | null>;
  update: (state: Partial<PlaybackState>) => void;
  reset: (showVersion?: number) => void;
  syncFromSnapshot: (showVersion: number, snapshot: PlaybackStateSnapshot) => void;
}

const PlaybackModel = createModel<PlaybackModelState>(() => {
  const state = signal<PlaybackState>(defaultPlayback);

  const currentEventId = computed(() => state.value.currentEventId);
  // The single "current" cue for display/scroll/highlight follows the playback
  // cursor exactly. Preferring the active RES here made stepping onto a PRE-RES
  // appear to do nothing (highlight stayed on the previous RES), so we use the
  // raw cursor. The earlier double-highlight bug was the `|| currentResolveEventId`
  // rule, which is intentionally NOT used here.
  const currentCueId = computed(() => state.value.currentEventId);
  const status = computed(() => state.value.status);

  function update(patch: Partial<PlaybackState>) {
    state.value = { ...state.value, ...patch };
  }

  function reset(showVersion?: number) {
    state.value =
      showVersion !== undefined ? { ...defaultPlayback, showVersion } : { ...defaultPlayback };
  }

  function syncFromSnapshot(showVersion: number, snapshot: PlaybackStateSnapshot) {
    state.value = {
      showVersion,
      status: snapshot.status ?? null,
      executionSequence: snapshot.executionSequence ?? null,
      currentResolveEventId: snapshot.currentResolveEventId ?? null,
      currentEventId: snapshot.currentEventId ?? null,
      activeSegment: snapshot.activeSegment
        ? {
            resolveEventId: snapshot.activeSegment.resolveEventId ?? 0,
            nextResolveEventId: snapshot.activeSegment.nextResolveEventId ?? null,
            inlineEventIds: snapshot.activeSegment.inlineEventIds ?? [],
            currentInlineIndex: snapshot.activeSegment.currentInlineIndex ?? 0,
          }
        : null,
      startedAt: snapshot.startedAt ?? null,
    };
  }

  return {
    state,
    currentEventId,
    currentCueId,
    status,
    update,
    reset,
    syncFromSnapshot,
  };
});

export const playbackModel = new PlaybackModel();
