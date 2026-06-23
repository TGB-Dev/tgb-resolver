import {
  ShortenedTimelineEventType,
  type TimelineEvent,
  TimelineEventType,
  type TimelineTableItem,
} from "./types";

export const toShortenedTimelineEventType: Record<TimelineEventType, ShortenedTimelineEventType> = {
  [TimelineEventType.CONTESTANT_RESOLVE]: ShortenedTimelineEventType.CR,
  [TimelineEventType.PLAY_SFX]: ShortenedTimelineEventType.PS,
  [TimelineEventType.SHOW_IMAGE]: ShortenedTimelineEventType.SI,
};

export const toTimelineEventType: Record<ShortenedTimelineEventType, TimelineEventType> = {
  [ShortenedTimelineEventType.CR]: TimelineEventType.CONTESTANT_RESOLVE,
  [ShortenedTimelineEventType.PS]: TimelineEventType.PLAY_SFX,
  [ShortenedTimelineEventType.SI]: TimelineEventType.SHOW_IMAGE,
};

export function toTimelineTableItem(event: TimelineEvent): TimelineTableItem | undefined {
  switch (event.type) {
    case TimelineEventType.CONTESTANT_RESOLVE:
      return {
        id: event.id,
        type: ShortenedTimelineEventType.CR,
        name: event.payload.username ?? "Unknown",
        problem: event.payload.problem,
        newScore: event.payload.newScore,
        newRank: event.payload.newRank,
        triggerOffsetSeconds: event.triggerOffsetSeconds,
        requireManualInteraction: event.requireManualInteraction,
      };
    case TimelineEventType.PLAY_SFX:
      return {
        id: event.id,
        type: ShortenedTimelineEventType.PS,
        name: `Play SFX: ${event.payload.sfxId}`,
        problem: "",
        triggerOffsetSeconds: event.triggerOffsetSeconds,
        requireManualInteraction: event.requireManualInteraction,
      };
    case TimelineEventType.SHOW_IMAGE:
      return {
        id: event.id,
        type: ShortenedTimelineEventType.SI,
        name: `Show Image: ${event.payload.imageId}`,
        problem: "",
        triggerOffsetSeconds: event.triggerOffsetSeconds,
        requireManualInteraction: event.requireManualInteraction,
      };
    default:
      return undefined;
  }
}
