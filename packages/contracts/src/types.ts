export const SHOW_SCHEMA_VERSION = 1;
export const FILE_EXTENSION = ".tgbresolver";

export type ShowMode = "editing" | "live";

export type PlaybackStatus = "idle" | "running" | "paused" | "completed";

export type AssetKind = "image" | "sfx";

export type TimelineEventType = "RES" | "IMG" | "SFX";

export interface EventBase {
  id: number;
  triggerOffsetSeconds?: number;
  requireManualInteraction?: boolean;
  customName?: string;
}

export interface ResolveEvent extends EventBase {
  type: "RES";
  payload: {
    realName: string;
    username: string;
    problem: string;
    newScore: number;
    newRank: number;
  };
}

export interface ShowImageEvent extends EventBase {
  type: "IMG";
  payload: {
    imageId: string;
    durationSeconds?: number;
  };
}

export interface PlaySfxEvent extends EventBase {
  type: "SFX";
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
  meta: ShowMeta;
  contest: ShowContestData;
  automation: ShowAutomation;
  playback: ShowPlaybackState;
  assets: ShowAssets;
  timeline: TimelineEvent[];
}

export type ResolveEventPatch = Pick<
  EventBase,
  "triggerOffsetSeconds" | "requireManualInteraction" | "customName"
>;

export interface NonResolveEventPatchPayload {
  imageId?: string | undefined;
  sfxId?: string | undefined;
  durationSeconds?: number | undefined;
}

export interface NonResolveEventPatch {
  type?: "IMG" | "SFX" | undefined;
  triggerOffsetSeconds?: number | undefined;
  requireManualInteraction?: boolean | undefined;
  customName?: string | undefined;
  payload?: NonResolveEventPatchPayload | undefined;
}

export interface ShowVersionedRequest {
  showVersion: number;
}

export interface ImportXmlRequest {
  xml: string;
}

export interface ImportBundleRequest {
  bytes: string;
}

export interface AssetUploadRequest extends ShowVersionedRequest {
  id: string;
  originalName: string;
  contentType: string;
  bytes: string;
}

export interface ResolveEventPatchRequest extends ShowVersionedRequest, ResolveEventPatch {}

export interface NonResolveEventPatchRequest extends ShowVersionedRequest {
  type?: "IMG" | "SFX" | undefined;
  triggerOffsetSeconds?: number | undefined;
  requireManualInteraction?: boolean | undefined;
  customName?: string | undefined;
  payload?: NonResolveEventPatchPayload | undefined;
}

export interface NonResolveInsertRequest extends ShowVersionedRequest {
  event: ShowImageEvent | PlaySfxEvent;
}

export interface PlaybackAutomationPatchRequest extends ShowVersionedRequest {
  autoResolveEnabled?: boolean | undefined;
  autoResolveSpeedMs?: number | undefined;
  fullAutoEnabled?: boolean | undefined;
}

export type ShowServiceErrorReason =
  | "version_drift"
  | "readonly"
  | "invalid_state"
  | "invalid_request"
  | "not_found";

export interface ShowServiceErrorResponse {
  reason: ShowServiceErrorReason;
  showVersion: number;
  message: string;
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
      type: "command-applied";
      showVersion: number;
      command: string;
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
