import {
  type PlaybackSegment,
  PlaybackStatus,
  type PlaySfxEvent,
  type PreResolveEvent,
  type ProblemDefinition,
  SHOW_SCHEMA_VERSION,
  type ShowAsset,
  type ShowFile,
  type ShowImageEvent,
  ShowMode,
  type ShowPlaybackState,
  ShowSource,
  type TimelineEvent,
  TimelineEventType,
  TimelineMode,
  type TimelineTableItem,
  type UserDefinition,
  VerdictRunResult,
} from "./types";

export function isResolveEvent(event: TimelineEvent): boolean {
  return event.type === TimelineEventType.RES;
}

export function isShowImageEvent(event: TimelineEvent): event is ShowImageEvent {
  return event.type === TimelineEventType.IMG;
}

export function isPlaySfxEvent(event: TimelineEvent): event is PlaySfxEvent {
  return event.type === TimelineEventType.SFX;
}

export function isPreResolveEvent(event: TimelineEvent): event is PreResolveEvent {
  return event.type === TimelineEventType.PRE;
}

export function isNonResolveEvent(
  event: TimelineEvent,
): event is ShowImageEvent | PlaySfxEvent | PreResolveEvent {
  return event.type !== TimelineEventType.RES;
}

export function createEmptyShow(partial?: Partial<ShowFile>): ShowFile {
  return {
    schemaVersion: SHOW_SCHEMA_VERSION,
    showVersion: 0,
    mode: ShowMode.EDITING,
    timelineMode: TimelineMode.RW,
    meta: {
      title: "Untitled show",
      source: ShowSource.MANUAL,
    },
    contest: {
      durationSeconds: 0,
      freezeDurationSeconds: 0,
      problems: [],
      users: [],
      preFreezeSnapshot: [],
    },
    automation: {
      autoResolveEnabled: false,
      autoResolveSpeedMs: 3000,
      fullAutoEnabled: false,
    },
    playback: {
      status: PlaybackStatus.IDLE,
      executionSequence: 0,
    },
    assets: {
      images: [],
      sfx: [],
    },
    timeline: [],
    ...partial,
  };
}

export function sortTimeline(timeline: TimelineEvent[]): TimelineEvent[] {
  return [...timeline].sort((a, b) => a.position - b.position || a.id - b.id);
}

export function normalizeShow(show: ShowFile): ShowFile {
  return {
    ...show,
    timeline: sortTimeline(show.timeline).map((event) => ({
      ...event,
      triggerOffsetSeconds: event.triggerOffsetSeconds ?? 0,
      requireManualInteraction: event.requireManualInteraction ?? false,
    })),
  };
}

export function getAssetCollections(show: ShowFile): Record<string, ShowAsset[]> {
  return {
    image: show.assets.images ?? [],
    sfx: show.assets.sfx ?? [],
  };
}

export function buildPlaybackSegments(show: ShowFile): PlaybackSegment[] {
  const timeline = sortTimeline(show.timeline);
  const resolveIndexes = timeline
    .map((event, index) => (event.type === TimelineEventType.RES ? index : -1))
    .filter((index) => index >= 0);

  return resolveIndexes.map((resolveIndex, segmentIndex) => {
    const resolveEvent = timeline[resolveIndex];
    if (!resolveEvent) {
      throw new Error(`Missing resolve event at index ${resolveIndex}`);
    }
    const nextResolveIndex = resolveIndexes[segmentIndex + 1];
    const segmentTail =
      nextResolveIndex === undefined
        ? timeline.slice(resolveIndex + 1)
        : timeline.slice(resolveIndex + 1, nextResolveIndex);

    return {
      resolveEventId: resolveEvent.id,
      nextResolveEventId:
        nextResolveIndex === undefined ? undefined : timeline[nextResolveIndex]?.id,
      inlineEvents: segmentTail.filter(isNonResolveEvent),
    };
  });
}

function resolveDisplayName(customName: string | undefined, placeholderName: string) {
  return customName && customName.trim().length > 0 ? customName : placeholderName;
}

export function toTimelineTableItem(
  event: TimelineEvent,
  playback?: ShowPlaybackState,
  autoResolveSpeedMs?: number,
  userMap?: Record<number, UserDefinition>,
  problemMap?: Record<number, ProblemDefinition>,
): TimelineTableItem {
  const activeSegment = playback?.activeSegment;
  const isCurrentResolve = playback?.currentResolveEventId === event.id;
  const isCurrentInlineEvent = playback?.currentEventId === event.id && !isCurrentResolve;
  const isInActiveSegment =
    activeSegment?.resolveEventId === event.id ||
    activeSegment?.inlineEventIds?.includes(event.id) ||
    false;

  switch (event.type) {
    case TimelineEventType.RES: {
      const user = userMap?.[event.payload.userId];
      const problem = problemMap?.[event.payload.problemId];
      const resolvePlaceholderName = user?.realName ?? user?.username ?? "";
      return {
        id: event.id,
        type: event.type,
        name: resolveDisplayName(event.customName, resolvePlaceholderName),
        customName: event.customName,
        placeholderName: resolvePlaceholderName,
        realName: user?.realName,
        username: user?.username,
        problem: problem?.label,
        problemDisplayName: problem?.name,
        newProblemScore: event.payload.newProblemScore,
        newTotalScore: event.payload.newTotalScore,
        newRank: event.payload.newRank,
        verdict: event.payload.verdict,
        triggerOffsetSeconds: event.triggerOffsetSeconds,
        requireManualInteraction: event.requireManualInteraction,
        durationSeconds: autoResolveSpeedMs !== undefined ? autoResolveSpeedMs / 1000 : undefined,
        isCurrentResolve,
        isCurrentInlineEvent,
        isInActiveSegment,
      };
    }
    case TimelineEventType.SFX: {
      const sfxPlaceholderName = `SFX ${event.payload.sfxId}`;
      return {
        id: event.id,
        type: event.type,
        name: resolveDisplayName(event.customName, sfxPlaceholderName),
        customName: event.customName,
        placeholderName: sfxPlaceholderName,
        triggerOffsetSeconds: event.triggerOffsetSeconds,
        requireManualInteraction: event.requireManualInteraction,
        durationSeconds: event.payload.durationSeconds,
        assetId: event.payload.sfxId,
        isCurrentResolve,
        isCurrentInlineEvent,
        isInActiveSegment,
      };
    }
    case TimelineEventType.IMG: {
      const imagePlaceholderName = `IMG ${event.payload.imageId}`;
      return {
        id: event.id,
        type: event.type,
        name: resolveDisplayName(event.customName, imagePlaceholderName),
        customName: event.customName,
        placeholderName: imagePlaceholderName,
        triggerOffsetSeconds: event.triggerOffsetSeconds,
        requireManualInteraction: event.requireManualInteraction,
        durationSeconds: event.payload.durationSeconds,
        assetId: event.payload.imageId,
        isCurrentResolve,
        isCurrentInlineEvent,
        isInActiveSegment,
      };
    }
    case TimelineEventType.PRE: {
      const resolvePlaceholderName = `PRE-RES`;
      const user = userMap?.[event.payload.userId];
      const problem = problemMap?.[event.payload.problemId];
      return {
        id: event.id,
        type: event.type,
        name: resolveDisplayName(event.customName, resolvePlaceholderName),
        customName: event.customName,
        placeholderName: resolvePlaceholderName,
        realName: user?.realName,
        username: user?.username,
        problem: problem?.label,
        problemDisplayName: problem?.name,
        newProblemScore: event.payload.newProblemScore,
        newTotalScore: event.payload.newTotalScore,
        newRank: event.payload.newRank,
        verdict: event.payload.verdict,
        triggerOffsetSeconds: event.triggerOffsetSeconds,
        requireManualInteraction: event.requireManualInteraction,
        durationSeconds: autoResolveSpeedMs !== undefined ? autoResolveSpeedMs / 1000 : undefined,
        isCurrentResolve,
        isCurrentInlineEvent,
        isInActiveSegment,
      };
    }
    case TimelineEventType.CUS: {
      const placeholderName = `Custom event`;
      return {
        id: event.id,
        type: event.type,
        name: resolveDisplayName(event.customName, placeholderName),
        customName: event.customName,
        placeholderName,
        triggerOffsetSeconds: event.triggerOffsetSeconds,
        requireManualInteraction: event.requireManualInteraction,
        isCurrentResolve,
        isCurrentInlineEvent,
        isInActiveSegment,
      };
    }
  }
}

function buildContestLookups(show: ShowFile): {
  userById: Record<number, UserDefinition>;
  problemById: Record<number, ProblemDefinition>;
} {
  const userById = Object.fromEntries(
    (show.contest.users ?? []).map((user) => [user.id, user] as const),
  );
  const problemById = Object.fromEntries(
    (show.contest.problems ?? []).map((problem) => [problem.id, problem] as const),
  );
  return { userById, problemById };
}

export function toTimelineTableItems(show: ShowFile): TimelineTableItem[] {
  const { userById, problemById } = buildContestLookups(show);
  const initialFromSnapshot = (show.contest.preFreezeSnapshot ?? []).reduce(
    (acc, entry) => {
      if (!(entry.userId in acc)) {
        acc[entry.userId] = { score: entry.totalScore ?? 0, rank: entry.rank ?? 0 };
      }
      return acc;
    },
    {} as Record<number, { score: number; rank: number }>,
  );

  const teamStates = { ...initialFromSnapshot };

  return sortTimeline(show.timeline).map((event) => {
    const item = toTimelineTableItem(
      event,
      show.playback,
      show.automation.autoResolveSpeedMs,
      userById,
      problemById,
    );

    if (event.type === TimelineEventType.RES) {
      const userId = event.payload.userId;
      const previous = teamStates[userId];
      if (previous) {
        item.oldScore = previous.score;
        item.oldRank = previous.rank;
      }
      teamStates[userId] = {
        score: event.payload.newTotalScore,
        rank: event.payload.newRank,
      };
    }

    return item;
  });
}

export interface LeaderboardProblemResult {
  problemId: number;
  label: string;
  name: string;
  score: number;
  verdict: VerdictRunResult;
}

export interface LeaderboardEntry {
  userId: number;
  username: string;
  realName: string;
  rank: number;
  totalScore: number;
  totalPenalty: number;
  problems: LeaderboardProblemResult[];
}

let lastShow: ShowFile | undefined;
let entryCache = new Map<number, LeaderboardEntry>();

function problemsEqual(a: LeaderboardProblemResult[], b: LeaderboardProblemResult[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((p, i) => p.score === b[i]?.score && p.verdict === b[i]?.verdict);
}

function entriesEqual(a: LeaderboardEntry, b: LeaderboardEntry): boolean {
  return (
    a.rank === b.rank &&
    a.totalScore === b.totalScore &&
    a.totalPenalty === b.totalPenalty &&
    problemsEqual(a.problems, b.problems)
  );
}

/// <summary>
///   Derives the live leaderboard (the audience / resolving view) from the
///   centralized problem + user maps and the freeze snapshot, folded forward
///   by every resolve event up to <paramref name="upToEventId" /> (or all of
///   them when omitted). Names are resolved from the contest maps so callers
///   never need the denormalized strings.
/// </summary>
export function deriveLeaderboard(show: ShowFile, upToEventId?: number): LeaderboardEntry[] {
  if (lastShow !== show) {
    lastShow = show;
    entryCache = new Map();
  }

  const { userById, problemById } = buildContestLookups(show);
  const entries = new Map<
    number,
    {
      score: number;
      penalty: number;
      rank: number;
      problems: Map<number, { score: number; verdict: VerdictRunResult }>;
    }
  >();

  for (const entry of show.contest.preFreezeSnapshot ?? []) {
    const problems = new Map<number, { score: number; verdict: VerdictRunResult }>();
    for (const problem of entry.problems ?? []) {
      problems.set(problem.problemId, { score: problem.score, verdict: problem.verdict });
    }
    entries.set(entry.userId, {
      score: entry.totalScore,
      penalty: entry.totalPenalty,
      rank: entry.rank,
      problems,
    });
  }

  const ordered = sortTimeline(show.timeline);
  const target =
    upToEventId !== undefined ? ordered.find((event) => event.id === upToEventId) : undefined;
  const targetPosition = target?.position ?? Number.POSITIVE_INFINITY;

  for (const event of ordered) {
    if (event.position > targetPosition) break;

    if (event.type === TimelineEventType.PRE) {
      const state = entries.get(event.payload.userId);
      if (!state) continue;
      state.problems.set(event.payload.problemId, {
        score: state.problems.get(event.payload.problemId)?.score ?? 0,
        verdict: VerdictRunResult.PENDING,
      });
      continue;
    }

    if (event.type !== TimelineEventType.RES) continue;

    const state = entries.get(event.payload.userId);
    if (!state) continue;

    state.score = event.payload.newTotalScore;
    state.rank = event.payload.newRank;
    state.penalty = event.payload.newTotalPenalty;
    state.problems.set(event.payload.problemId, {
      score: event.payload.newProblemScore,
      verdict: event.payload.verdict,
    });
  }

  return [...entries.entries()]
    .map(([userId, state]) => {
      const user = userById[userId];
      const problems = [...state.problems.entries()]
        .map(([problemId, result]) => ({
          problemId,
          label: problemById[problemId]?.label ?? "",
          name: problemById[problemId]?.name ?? "",
          score: result.score,
          verdict: result.verdict,
        }))
        .sort((a, b) => a.problemId - b.problemId);

      const entry: LeaderboardEntry = {
        userId,
        username: user?.username ?? "",
        realName: user?.realName ?? "",
        rank: state.rank,
        totalScore: state.score,
        totalPenalty: state.penalty,
        problems,
      };

      const cached = entryCache.get(userId);
      if (cached && entriesEqual(cached, entry)) return cached;

      entryCache.set(userId, entry);
      return entry;
    })
    .sort(
      (a, b) =>
        b.totalScore - a.totalScore ||
        a.totalPenalty - b.totalPenalty ||
        a.rank - b.rank ||
        a.userId - b.userId,
    );
}
