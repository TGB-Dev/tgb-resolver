import { signal } from "@preact/signals-react";
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

export const playbackSignal = signal<PlaybackState>(defaultPlayback);

export function updatePlayback(state: Partial<PlaybackState>) {
  playbackSignal.value = { ...playbackSignal.value, ...state };
}

export function resetPlayback(showVersion?: number) {
  playbackSignal.value =
    showVersion !== undefined ? { ...defaultPlayback, showVersion } : { ...defaultPlayback };
}

export function syncPlaybackFromSnapshot(showVersion: number, snapshot: PlaybackStateSnapshot) {
  playbackSignal.value = {
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
