import {
  type AssetCollectionSnapshot,
  type AutomationSnapshot,
  type PlaybackStateSnapshot,
  PlaybackStatus,
  type ShowAssetSnapshot,
  type ShowMetaSnapshot,
  ShowMode,
  ShowSource,
  TimelineEventType,
  TimelineMode,
  VerdictRunResult,
} from "@tgb-resolver/contracts";

import { ShowMessageType, ShowRefetchReason } from "./signalr";

export type ShowPlaybackState = PlaybackStateSnapshot;
export type ShowMeta = ShowMetaSnapshot;
export type ShowAutomation = AutomationSnapshot;
export type ShowAssets = AssetCollectionSnapshot;
export type ShowAsset = ShowAssetSnapshot;

export interface ProblemDefinition {
  id: number;
  label: string;
  name: string;
  score: number;
}

export interface UserDefinition {
  id: number;
  username: string;
  realName: string;
}

export interface ProblemFreezeResult {
  problemId: number;
  score: number;
  verdict: VerdictRunResult;
}

export interface FreezeSnapshotEntry {
  userId: number;
  totalScore: number;
  totalPenalty: number;
  rank: number;
  problems: ProblemFreezeResult[];
  lastRunId: number | null;
  lastSubmittedSeconds: number | null;
}

export interface ShowContestData {
  durationSeconds: number;
  freezeDurationSeconds: number;
  problems: ProblemDefinition[];
  users: UserDefinition[];
  preFreezeSnapshot: FreezeSnapshotEntry[];
}

export type {
  LiveModeChangedMessage,
  PlaybackStateChangedMessage,
  ShowReplacedMessage,
  TimelineEventAddedMessage,
  TimelineEventRemovedMessage,
  TimelineEventUpdatedMessage,
  TimelineReorderedMessage,
} from "./signalr";
export {
  PlaybackStatus,
  ShowMessageType,
  ShowMode,
  ShowRefetchReason,
  ShowSource,
  TimelineEventType,
  TimelineMode,
  VerdictRunResult,
};

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

export interface EventBase {
  id: number;
  position: number;
  triggerOffsetSeconds?: number;
  requireManualInteraction?: boolean;
  customName?: string;
}

export interface ResolvePayload {
  userId: number;
  problemId: number;
  newTotalScore: number;
  newTotalPenalty: number;
  newRank: number;
  newProblemScore: number;
  verdict: VerdictRunResult;
  timeSinceStart: number;
}

export interface ResolveEvent extends EventBase {
  type: TimelineEventType.RES;
  payload: ResolvePayload;
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

export interface PreResolveEvent extends EventBase {
  type: TimelineEventType.PRE;
  payload: ResolvePayload;
}

export interface CustomEvent extends EventBase {
  type: TimelineEventType.CUS;
  payload: Record<string, unknown>;
}

export type TimelineEvent =
  | ResolveEvent
  | ShowImageEvent
  | PlaySfxEvent
  | PreResolveEvent
  | CustomEvent;

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
  | { type: ShowMessageType.ShowReplaced; showVersion: number }
  | { type: ShowMessageType.TimelineEventAdded; showVersion: number; event: TimelineEvent }
  | { type: ShowMessageType.TimelineEventUpdated; showVersion: number; event: TimelineEvent }
  | { type: ShowMessageType.TimelineEventRemoved; showVersion: number; eventId: number }
  | { type: ShowMessageType.TimelineReordered; showVersion: number; orderedEventIds: number[] }
  | { type: ShowMessageType.PlaybackStateChanged; showVersion: number; playback: ShowPlaybackState }
  | { type: ShowMessageType.LiveModeChanged; showVersion: number; mode: ShowMode };

export interface TimelineTableItem {
  id: number;
  type: TimelineEventType;
  name: string;
  customName?: string;
  placeholderName: string;
  realName?: string;
  username?: string;
  problem?: string;
  problemDisplayName?: string;
  newProblemScore?: number;
  oldScore?: number;
  oldRank?: number;
  newTotalScore?: number;
  newRank?: number;
  verdict?: VerdictRunResult;
  triggerOffsetSeconds?: number;
  requireManualInteraction?: boolean;
  durationSeconds?: number;
  assetId?: string;
  isActive: boolean;
}



export enum ShowConnectionStatus {
  Idle = "idle",
  Connecting = "connecting",
  Connected = "connected",
  Reconnecting = "reconnecting",
  Disconnected = "disconnected",
  Failed = "failed",
}
