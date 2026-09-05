import {
  type AssetCollectionSnapshot,
  type AutomationSnapshot,
  type ContestSnapshot,
  type FreezeSnapshotEntrySnapshot,
  type PlaybackStateSnapshot,
  PlaybackStatus,
  type ProblemDefinitionSnapshot,
  type ProblemFreezeResultSnapshot,
  type ResolveEventPayloadSnapshot,
  type ShowAssetSnapshot,
  type ShowMetaSnapshot,
  ShowMode,
  ShowSource,
  TimelineEventType,
  TimelineMode,
  type UserDefinitionSnapshot,
  VerdictRunResult,
} from "@tgb-resolver/contracts";

export type ShowPlaybackState = PlaybackStateSnapshot;
export type ShowMeta = ShowMetaSnapshot;
export type ShowAutomation = AutomationSnapshot;
export type ShowAssets = AssetCollectionSnapshot;
export type ShowAsset = ShowAssetSnapshot;

export type ProblemDefinition = Required<ProblemDefinitionSnapshot>;
export type UserDefinition = Required<UserDefinitionSnapshot>;

export type ProblemFreezeResult = Required<Omit<ProblemFreezeResultSnapshot, "verdict">> & {
  verdict: VerdictRunResult;
};

export type FreezeSnapshotEntry = Required<
  Omit<FreezeSnapshotEntrySnapshot, "problems" | "lastRunId" | "lastSubmittedSeconds">
> & {
  problems: ProblemFreezeResult[];
  lastRunId: number | null;
  lastSubmittedSeconds: number | null;
};

export type ShowContestData = Required<
  Omit<ContestSnapshot, "problems" | "users" | "preFreezeSnapshot">
> & {
  problems: ProblemDefinition[];
  users: UserDefinition[];
  preFreezeSnapshot: FreezeSnapshotEntry[];
};

export type ResolvePayload = Required<ResolveEventPayloadSnapshot>;

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

export enum ShowMessageType {
  ShowReplaced = "show-replaced",
  TimelineEventAdded = "timeline-event-added",
  TimelineEventUpdated = "timeline-event-updated",
  TimelineEventRemoved = "timeline-event-removed",
  TimelineReordered = "timeline-reordered",
  PlaybackStateChanged = "playback-state-changed",
  LiveModeChanged = "live-mode-changed",
}

export enum ShowRefetchReason {
  ShowReplaced = "ShowReplaced",
  Optimized = "Optimized",
}

export interface TimelineEventAddedMessage {
  showVersion: number;
  event: TimelineEventSnapshotWire;
}

export interface TimelineEventUpdatedMessage {
  showVersion: number;
  event: TimelineEventSnapshotWire;
}

export interface TimelineEventRemovedMessage {
  showVersion: number;
  eventId: number;
}

export interface TimelineReorderedMessage {
  showVersion: number;
  orderedEventIds: number[];
}

export interface ShowReplacedMessage {
  showVersion: number;
}

export interface PlaybackStateChangedMessage {
  showVersion: number;
  playback: ShowPlaybackState;
}

export interface LiveModeChangedMessage {
  showVersion: number;
  mode: ShowMode;
}

export interface TimelineEventSnapshotWire {
  id: number;
  position: number;
  type: string;
  durationSeconds?: number;
  triggerOffsetSeconds?: number;
  requireManualInteraction?: boolean;
  customName?: string;
  resolve?: ResolvePayloadWire;
  pre?: ResolvePayloadWire;
  custom?: CustomPayloadWire;
}

export interface ResolvePayloadWire {
  userId: number;
  problemId: number;
  newTotalScore: number;
  newTotalPenalty: number;
  newRank: number;
  newProblemScore: number;
  verdict: string;
  timeSinceStart: number;
}

export interface CustomPayloadWire {
  extId: string;
  extPayload?: Record<string, unknown>;
}

export { PlaybackStatus, ShowMode, ShowSource, TimelineEventType, TimelineMode, VerdictRunResult };

export const SHOW_SCHEMA_VERSION = 1;
export const FILE_EXTENSION = ".tgbresolver";

export interface EventBase {
  id: number;
  position: number;
  durationSeconds?: number;
  triggerOffsetSeconds?: number;
  requireManualInteraction?: boolean;
  customName?: string;
}

export interface ResolveEvent extends EventBase {
  type: TimelineEventType.RES;
  payload: ResolvePayload;
}

export interface PreResolveEvent extends EventBase {
  type: TimelineEventType.PRE;
  payload: ResolvePayload;
}

export interface CustomEvent extends EventBase {
  type: TimelineEventType.CUS;
  payload: {
    extId: string;
    extPayload?: Record<string, unknown>;
  };
}

export type TimelineEvent = ResolveEvent | PreResolveEvent | CustomEvent;

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
  tickRate?: number;
}

export type ShowWebSocketMessage =
  | { type: ShowMessageType.ShowReplaced; showVersion: number }
  | { type: ShowMessageType.TimelineEventAdded; showVersion: number; event: TimelineEvent }
  | { type: ShowMessageType.TimelineEventUpdated; showVersion: number; event: TimelineEvent }
  | { type: ShowMessageType.TimelineEventRemoved; showVersion: number; eventId: number }
  | { type: ShowMessageType.TimelineReordered; showVersion: number; orderedEventIds: number[] }
  | { type: ShowMessageType.PlaybackStateChanged; showVersion: number; playback: ShowPlaybackState }
  | { type: ShowMessageType.LiveModeChanged; showVersion: number; mode: ShowMode };

export interface TimelineTableItem extends EventBase {
  type: TimelineEventType;
  name: string;
  placeholderName: string;

  // Joined user / problem metadata for display
  realName?: string;
  username?: string;
  problem?: string;
  problemDisplayName?: string;

  // Joined resolution calculations
  oldScore?: number;
  oldRank?: number;
  durationSeconds?: number;

  // Flattened ResolvePayload fields
  newProblemScore?: ResolvePayload["newProblemScore"];
  newTotalScore?: ResolvePayload["newTotalScore"];
  newRank?: ResolvePayload["newRank"];
  verdict?: ResolvePayload["verdict"];

  // Flattened CustomEvent payload fields
  extId?: string;
  extPayload?: Record<string, unknown>;

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
