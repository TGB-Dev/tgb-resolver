import { PlaybackStatus, ShowMode, TimelineEventType, TimelineMode } from "@tgb-resolver/contracts";

export { PlaybackStatus, ShowMode, TimelineEventType, TimelineMode };

export const SHOW_SCHEMA_VERSION = 1;
export const FILE_EXTENSION = ".tgbresolver";

export interface ClockSyncRequest {
  sessionId: string;
  clientSentAtUnixMs: number;
}

export interface ClockSyncResponse {
  sessionId: string;
  clientSentAtUnixMs: number;
  serverReceivedAtUnixMs: number;
  serverTransmittedAtUnixMs: number;
}

export enum AssetKind {
  Image = "image",
  Sfx = "sfx",
}

export interface EventBase {
  id: number;
  position: number;
  triggerOffsetSeconds?: number;
  requireManualInteraction?: boolean;
  customName?: string;
}

export interface ResolveEvent extends EventBase {
  type: TimelineEventType.RES;
  payload: {
    realName: string;
    username: string;
    problem: string;
    newScore: number;
    newRank: number;
  };
}

export interface ShowImageEvent extends EventBase {
  type: TimelineEventType.IMG;
  payload: {
    imageId: string;
    durationSeconds?: number;
  };
}

export interface PlaySfxEvent extends EventBase {
  type: TimelineEventType.SFX;
  payload: {
    sfxId: string;
    durationSeconds?: number;
  };
}

export type TimelineEvent = ResolveEvent | ShowImageEvent | PlaySfxEvent;

export interface ShowAsset {
  id: string;
  kind: AssetKind;
  fileName: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  xxh364: string;
}

export interface ShowAssets {
  images: ShowAsset[];
  sfx: ShowAsset[];
}

export interface ShowAutomation {
  autoResolveEnabled: boolean;
  autoResolveSpeedMs: number;
  fullAutoEnabled: boolean;
}

export interface ActivePlaybackSegment {
  resolveEventId: number;
  nextResolveEventId?: number;
  inlineEventIds: number[];
  currentInlineIndex: number;
}

export interface ShowPlaybackState {
  status: PlaybackStatus;
  executionSequence: number;
  currentResolveEventId?: number;
  currentEventId?: number;
  activeSegment?: ActivePlaybackSegment;
  startedAt?: number;
}

export interface ShowMeta {
  title: string;
  contestId?: string;
  source?: "xml" | "bundle" | "manual";
}

export interface ShowContestSnapshotTeam {
  teamId: number;
  realName: string;
  username: string;
  score: number;
  rank: number;
}

export interface ShowContestData {
  durationSeconds: number;
  freezeDurationSeconds: number;
  preFreezeSnapshot: ShowContestSnapshotTeam[];
}

export interface ShowFile {
  schemaVersion: typeof SHOW_SCHEMA_VERSION;
  showVersion: number;
  mode: ShowMode;
  timelineMode: TimelineMode;
  meta: ShowMeta;
  contest: ShowContestData;
  automation: ShowAutomation;
  playback: ShowPlaybackState;
  assets: ShowAssets;
  timeline: TimelineEvent[];
}

export type ShowWebSocketMessage =
  | {
      type: "show-refetch-required";
      showVersion: number;
      reason: "version_drift" | "show_replaced" | "optimized";
    }
  | {
      type: "playback-state-changed";
      showVersion: number;
      playback: ShowPlaybackState;
    }
  | {
      type: "live-mode-changed";
      showVersion: number;
      mode: ShowMode;
    }
  | {
      type: "show-replaced";
      showVersion: number;
      source: ShowMeta["source"];
    };

export interface TimelineTableItem {
  id: number;
  type: TimelineEventType;
  name: string;
  customName?: string;
  placeholderName: string;
  problem?: string;
  newScore?: number;
  newRank?: number;
  triggerOffsetSeconds?: number;
  requireManualInteraction?: boolean;
  durationSeconds?: number;
  assetId?: string;
  isCurrentResolve?: boolean;
  isCurrentInlineEvent?: boolean;
  isInActiveSegment?: boolean;
}

export interface PlaybackSegment {
  resolveEventId: number;
  nextResolveEventId?: number;
  inlineEvents: Array<ShowImageEvent | PlaySfxEvent>;
}
