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

export interface TimelineEvent {
  /**
   * The event ID, count from 0
   * To identify in the timeline
   */
  id: number;

  /**
   * The event type
   */
  type: TimelineEventType;

  /**
   * The event payload
   */
  payload: TimelinePayload;

  /**
   * Trigger this event after `triggerDeltaSeconds` from the previous event.
   * Useful for automating certain reveals.
   * Treated as 0 when not specified.
   */
  triggerDeltaSeconds?: number;

  /**
   * Whether the player should wait for manual interaction or not.
   * Treated as `false` when not specified
   *
   * Be bypassed when the client plays with the "full-auto" mode
   */
  requireManualInteraction?: boolean;
}

/**
 * Payload type for {@link TimelineEventType.CONTESTANT_RESOLVE}
 */
export interface TimelineResolvePayload {
  username?: string;
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
