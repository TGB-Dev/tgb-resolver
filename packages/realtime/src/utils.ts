import {
  type CustomEvent,
  PlaybackStatus,
  type PreResolveEvent,
  type ProblemDefinition,
  SHOW_SCHEMA_VERSION,
  type ShowAsset,
  type ShowFile,
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

export function isPreResolveEvent(event: TimelineEvent): event is PreResolveEvent {
  return event.type === TimelineEventType.PRE;
}

export function isNonResolveEvent(event: TimelineEvent): event is PreResolveEvent | CustomEvent {
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
      activeEventIds: [],
    },
    assets: {
      items: [],
      folders: [],
    },
    timeline: [],
    tickRate: undefined,
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
      requireManualInteraction: event.requireManualInteraction ?? false,
    })),
  };
}

export function getAssetCollections(show: ShowFile): Record<string, ShowAsset[]> {
  return {
    image: (show.assets.items ?? []).filter((a) => a.contentType?.startsWith("image/")),
    sfx: (show.assets.items ?? []).filter((a) => !a.contentType?.startsWith("image/")),
  };
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
  const activeEventIds = playback?.activeEventIds ?? [];
  const isActive = activeEventIds.includes(event.id);

  switch (event.type) {
    case TimelineEventType.RES: {
      const user = userMap?.[event.payload.userId];
      const problem = problemMap?.[event.payload.problemId];
      const resolvePlaceholderName = user?.realName ?? user?.username ?? "";
      return {
        id: event.id,
        position: event.position,
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
        durationSeconds:
          event.durationSeconds ??
          (autoResolveSpeedMs !== undefined ? autoResolveSpeedMs / 1000 : undefined),
        isActive,
      };
    }
    case TimelineEventType.PRE: {
      const resolvePlaceholderName = `PRE-RES`;
      const user = userMap?.[event.payload.userId];
      const problem = problemMap?.[event.payload.problemId];
      return {
        id: event.id,
        position: event.position,
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
        durationSeconds:
          event.durationSeconds ??
          (autoResolveSpeedMs !== undefined ? autoResolveSpeedMs / 1000 : undefined),
        isActive,
      };
    }
    case TimelineEventType.CUS: {
      const placeholderName = event.payload.extId
        ? `Custom ${event.payload.extId}`
        : `Custom event`;
      return {
        id: event.id,
        position: event.position,
        type: event.type,
        name: resolveDisplayName(event.customName, placeholderName),
        customName: event.customName,
        placeholderName,
        extId: event.payload.extId,
        extPayload: event.payload.extPayload,
        durationSeconds:
          event.durationSeconds ??
          (autoResolveSpeedMs !== undefined ? autoResolveSpeedMs / 1000 : undefined),
        triggerOffsetSeconds: event.triggerOffsetSeconds,
        requireManualInteraction: event.requireManualInteraction,
        isActive,
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
  timeSinceStart: number;
}

export interface LeaderboardEntry {
  userId: number;
  username: string;
  realName: string;
  rank: number;
  totalScore: number;
  totalPenalty: number;
  problems: LeaderboardProblemResult[];
  lastSubmittedSeconds: number | null;
}

let lastShow: ShowFile | undefined;
let entryCache = new Map<number, LeaderboardEntry>();

function problemsEqual(a: LeaderboardProblemResult[], b: LeaderboardProblemResult[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (p, i) =>
      p.problemId === b[i]?.problemId &&
      p.score === b[i]?.score &&
      p.verdict === b[i]?.verdict &&
      p.timeSinceStart === b[i]?.timeSinceStart,
  );
}

function entriesEqual(a: LeaderboardEntry, b: LeaderboardEntry): boolean {
  return (
    a.rank === b.rank &&
    a.totalScore === b.totalScore &&
    a.totalPenalty === b.totalPenalty &&
    a.lastSubmittedSeconds === b.lastSubmittedSeconds &&
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
      problems: Map<number, { score: number; verdict: VerdictRunResult; timeSinceStart: number }>;
      lastSubmittedSeconds: number | null;
    }
  >();

  for (const entry of show.contest.preFreezeSnapshot ?? []) {
    const problems = new Map<
      number,
      { score: number; verdict: VerdictRunResult; timeSinceStart: number }
    >();
    for (const problem of entry.problems ?? []) {
      problems.set(problem.problemId, {
        score: problem.score,
        verdict: problem.verdict,
        timeSinceStart: 0,
      });
    }
    entries.set(entry.userId, {
      score: entry.totalScore,
      penalty: entry.totalPenalty,
      rank: entry.rank,
      problems,
      lastSubmittedSeconds: entry.lastSubmittedSeconds,
    });
  }

  const ordered = sortTimeline(show.timeline);
  const target =
    upToEventId !== undefined ? ordered.find((event) => event.id === upToEventId) : undefined;
  const targetPosition =
    target?.position ??
    (upToEventId !== undefined ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY);

  for (const event of ordered) {
    if (event.position > targetPosition) break;

    if (event.type === TimelineEventType.PRE) {
      const state = entries.get(event.payload.userId);
      if (!state) continue;
      const prev = state.problems.get(event.payload.problemId);
      state.problems.set(event.payload.problemId, {
        score: prev?.score ?? 0,
        verdict: VerdictRunResult.PENDING,
        timeSinceStart: prev?.timeSinceStart ?? 0,
      });
      continue;
    }

    if (event.type !== TimelineEventType.RES) continue;

    const state = entries.get(event.payload.userId);
    if (!state) continue;

    state.score = event.payload.newTotalScore;
    state.rank = event.payload.newRank;
    state.penalty = event.payload.newTotalPenalty;
    // Finalization RES events (problemId 0) only lock in the team's rank and
    // carry no problem result, so they must not add a phantom problem cell.
    if (event.payload.problemId !== 0)
      state.problems.set(event.payload.problemId, {
        score: event.payload.newProblemScore,
        verdict: event.payload.verdict,
        timeSinceStart: event.payload.timeSinceStart,
      });
  }

  const sorted: LeaderboardEntry[] = [...entries.entries()]
    .map(([userId, state]) => {
      const user = userById[userId];
      return {
        userId,
        username: user?.username ?? "",
        realName: user?.realName ?? "",
        rank: 0,
        totalScore: state.score,
        totalPenalty: state.penalty,
        lastSubmittedSeconds: state.lastSubmittedSeconds,
        problems: [...state.problems.entries()]
          .map(([problemId, result]) => ({
            problemId,
            label: problemById[problemId]?.label ?? "",
            name: problemById[problemId]?.name ?? "",
            score: result.score,
            verdict: result.verdict,
            timeSinceStart: result.timeSinceStart,
          }))
          .sort((a, b) => a.problemId - b.problemId),
      };
    })
    .sort(
      (a, b) =>
        b.totalScore - a.totalScore || a.totalPenalty - b.totalPenalty || a.userId - b.userId,
    );

  let rank = 0;
  let priorScore: number | null = null;
  let priorPenalty: number | null = null;

  return sorted.map((entry, index) => {
    if (
      priorScore === null ||
      priorPenalty === null ||
      Math.abs(entry.totalScore - priorScore) > 1e-9 ||
      Math.abs(entry.totalPenalty - priorPenalty) > 1e-9
    ) {
      rank = index + 1;
      priorScore = entry.totalScore;
      priorPenalty = entry.totalPenalty;
    }

    entry.rank = rank;

    const cached = entryCache.get(entry.userId);
    if (cached && entriesEqual(cached, entry)) return cached;

    entryCache.set(entry.userId, entry);
    return entry;
  });
}
