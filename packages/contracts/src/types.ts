export enum TimelineEventType {
  /**
   * Contestant resolve event
   */
  CONTESTANT_RESOLVE,

  /**
   * Play SFX event, useful for hyping up the crowds on certain contestant resolve events
   */
  PLAY_SFX,

  /**
   * Show image event, useful for revealing the awards
   */
  SHOW_IMAGE,

  // TODO: add more kind of supported events here
}

/**
 * Shortened for displaying on the frontend
 */
export enum ShortenedTimelineEventType {
  CR = "CR",
  PS = "PS",
  SI = "SI",
}

/**
 * Base timeline event
 */
export interface BaseTimelineEvent {
  /**
   * The event ID, count from 0
   * To identify in the timeline
   */
  id: number;

  /**
   * Trigger this event after `triggerOffsetSeconds` from the previous event.
   * Useful for automating certain reveals.
   * Treated as 0 when not specified.
   */
  triggerOffsetSeconds?: number;

  /**
   * Whether the player should wait for manual interaction or not.
   * Treated as `false` when not specified
   *
   * Be bypassed when the client plays with the "full-auto" mode
   */
  requireManualInteraction?: boolean;
}

/**
 * Unified timeline event type
 */
export type TimelineEvent = {
  [K in TimelineEventType]: BaseTimelineEvent & {
    /**
     * The event type
     */
    type: K;

    /**
     * The payload for this event
     */
    payload: TimelinePayloadMap[K];
  };
}[TimelineEventType];

/**
 * Payload type for {@link TimelineEventType.CONTESTANT_RESOLVE}
 */
export interface TimelineResolvePayload {
  username: string;
  problem: string;
  newScore: number;
  newRank: number;
  // TODO: add more fields as needed here
}

/**
 * Payload type for {@link TimelineEventType.PLAY_SFX}
 */
export interface TimelinePlaySfxPayload {
  sfxId: string;
}

/**
 * Payload type for {@link TimelineEventType.SHOW_IMAGE}
 */
export interface TimelineShowImagePayload {
  imageId: string;
}

/**
 * Unified payload types
 */
export type TimelinePayload =
  | TimelineResolvePayload
  | TimelinePlaySfxPayload
  | TimelineShowImagePayload;

export type TimelinePayloadMap = {
  [TimelineEventType.CONTESTANT_RESOLVE]: TimelineResolvePayload;
  [TimelineEventType.PLAY_SFX]: TimelinePlaySfxPayload;
  [TimelineEventType.SHOW_IMAGE]: TimelineShowImagePayload;
};

export type TimelineTableItem = {
  id: number;
  type: ShortenedTimelineEventType;
  name: string;
  problem?: string;
  newScore?: number;
  newRank?: number;
  triggerOffsetSeconds?: number;
  requireManualInteraction?: boolean;
};
