import {
  computed,
  createModel,
  type ReadonlySignal,
  type Signal,
  signal,
} from "@preact/signals-react";
import type { PlaybackStateSnapshot } from "@tgb-resolver/contracts";

export interface PlaybackState {
  showVersion: number;
  status: string | null;
  currentEventId: number | null;
  activeEventIds: number[];
  startedAt: number | null;
}

const defaultPlayback: PlaybackState = {
  showVersion: 0,
  status: "Idle",
  currentEventId: null,
  activeEventIds: [],
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
  syncVersion: (showVersion: number) => void;
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
      currentEventId: snapshot.currentEventId ?? null,
      activeEventIds: snapshot.activeEventIds ?? [],
      startedAt: snapshot.startedAt ?? null,
    };
  }

  function syncVersion(showVersion: number) {
    state.value = { ...state.value, showVersion };
  }

  return {
    state,
    currentEventId,
    currentCueId,
    status,
    update,
    reset,
    syncFromSnapshot,
    syncVersion,
  };
});

export const playbackModel = new PlaybackModel();
