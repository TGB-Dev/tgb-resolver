import {
  PlaybackStatus,
  type ResolvePayload,
  ShowMode,
  type TimelineEvent,
  type TimelineEventSnapshotWire,
  TimelineEventType,
  VerdictRunResult,
} from "@tgb-resolver/realtime";

function mapResolvePayload(src: NonNullable<TimelineEventSnapshotWire["resolve"]>): ResolvePayload {
  return {
    userId: src.userId,
    problemId: src.problemId,
    newTotalScore: src.newTotalScore,
    newTotalPenalty: src.newTotalPenalty,
    newRank: src.newRank,
    newProblemScore: src.newProblemScore,
    verdict: src.verdict as VerdictRunResult,
    timeSinceStart: src.timeSinceStart,
  };
}

export function mapTimelineEvent(src: TimelineEventSnapshotWire): TimelineEvent {
  const base = {
    id: src.id,
    position: src.position,
    durationSeconds: src.durationSeconds,
    triggerOffsetSeconds: src.triggerOffsetSeconds,
    requireManualInteraction: src.requireManualInteraction,
    customName: src.customName,
  };

  switch (src.type) {
    case TimelineEventType.RES: {
      const r = src.resolve;
      if (!r) throw new Error("RES timeline event missing Resolve payload");
      return {
        ...base,
        type: TimelineEventType.RES,
        payload: mapResolvePayload(r),
      };
    }
    case TimelineEventType.PRE: {
      const r = src.pre;
      if (!r) throw new Error("PRE timeline event missing Pre payload");
      return {
        ...base,
        type: TimelineEventType.PRE,
        payload: mapResolvePayload(r),
      };
    }
    case TimelineEventType.CUS: {
      const custom = src.custom;
      return {
        ...base,
        type: TimelineEventType.CUS,
        payload: {
          extId: custom?.extId ?? "",
          extPayload: custom?.extPayload,
        },
      };
    }
    default:
      return {
        ...base,
        type: TimelineEventType.RES,
        payload: {
          userId: 0,
          problemId: 0,
          newTotalScore: 0,
          newTotalPenalty: 0,
          newRank: 0,
          newProblemScore: 0,
          verdict: VerdictRunResult.UNKNOWN,
          timeSinceStart: 0,
        },
      };
  }
}

export function mapStatus(status: string): string {
  return status === PlaybackStatus.RUNNING
    ? PlaybackStatus.RUNNING
    : status === PlaybackStatus.PAUSED
      ? PlaybackStatus.PAUSED
      : PlaybackStatus.IDLE;
}

export function mapMode(mode: string): ShowMode {
  return String(mode) === "Live" ? ShowMode.LIVE : ShowMode.EDITING;
}
