import {
  type ActivePlaybackSegmentSnapshot,
  type AssetCollectionSnapshot,
  type AutomationSnapshot,
  type ContestSnapshot,
  type ContestTeamSnapshot,
  type PlaybackStateSnapshot,
  PlaybackStatus,
  type ShowAssetSnapshot,
  type ShowMetaSnapshot,
  ShowMode,
  ShowSource,
  TimelineEventType,
  TimelineMode,
} from "@tgb-resolver/contracts";

export type ShowPlaybackState = PlaybackStateSnapshot;
export type ActivePlaybackSegment = ActivePlaybackSegmentSnapshot;
export type ShowContestData = ContestSnapshot;
export type ShowContestSnapshotTeam = ContestTeamSnapshot;
export type ShowMeta = ShowMetaSnapshot;
export type ShowAutomation = AutomationSnapshot;
export type ShowAssets = AssetCollectionSnapshot;
export type ShowAsset = ShowAssetSnapshot;

export { PlaybackStatus, ShowMode, ShowSource, TimelineEventType, TimelineMode };

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
  oldScore?: number;
  oldRank?: number;
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
