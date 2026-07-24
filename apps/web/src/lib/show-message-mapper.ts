import {
  PlaybackStatus,
  ShowMode,
  type TimelineEvent,
  type TimelineEventAddedMessage,
  TimelineEventType,
  VerdictRunResult,
} from "@tgb-resolver/realtime";

export function mapTimelineEvent(src: TimelineEventAddedMessage["Event"]): TimelineEvent {
  const base = {
    id: src.Id,
    position: src.Position,
    triggerOffsetSeconds: src.TriggerOffsetSeconds,
    requireManualInteraction: src.RequireManualInteraction,
    customName: src.CustomName,
  };

  switch (src.Type as string) {
    case TimelineEventType.RES: {
      const r = src.Resolve;
      if (!r) throw new Error("RES timeline event missing Resolve payload");
      return {
        ...base,
        type: TimelineEventType.RES,
        payload: {
          userId: r.UserId,
          problemId: r.ProblemId,
          newTotalScore: r.NewTotalScore,
          newTotalPenalty: r.NewTotalPenalty,
          newRank: r.NewRank,
          newProblemScore: r.NewProblemScore,
          verdict: r.Verdict as unknown as VerdictRunResult,
          timeSinceStart: r.TimeSinceStart,
        },
      };
    }
    case TimelineEventType.PRE: {
      const r = src.Pre;
      if (!r) throw new Error("PRE timeline event missing Pre payload");
      return {
        ...base,
        type: TimelineEventType.PRE,
        payload: {
          userId: r.UserId,
          problemId: r.ProblemId,
          newTotalScore: r.NewTotalScore,
          newTotalPenalty: r.NewTotalPenalty,
          newRank: r.NewRank,
          newProblemScore: r.NewProblemScore,
          verdict: r.Verdict as unknown as VerdictRunResult,
          timeSinceStart: r.TimeSinceStart,
        },
      };
    }
    case TimelineEventType.IMG: {
      const img = src.Image;
      if (!img) throw new Error("IMG timeline event missing Image payload");
      return {
        ...base,
        type: TimelineEventType.IMG,
        payload: { imageId: img.AssetId, durationSeconds: img.DurationSeconds },
      };
    }
    case TimelineEventType.SFX: {
      const sfx = src.Sfx;
      if (!sfx) throw new Error("SFX timeline event missing Sfx payload");
      return {
        ...base,
        type: TimelineEventType.SFX,
        payload: { sfxId: sfx.AssetId, durationSeconds: sfx.DurationSeconds },
      };
    }
    case TimelineEventType.CUS:
      return {
        ...base,
        type: TimelineEventType.CUS,
        payload: (src.Custom as Record<string, unknown>) ?? {},
      };
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
