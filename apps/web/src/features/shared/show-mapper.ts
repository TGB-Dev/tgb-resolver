import {
  PlaybackStatus,
  ShowMode,
  ShowSource,
  type ShowStateSnapshot,
  TimelineEventType,
  TimelineMode,
  VerdictRunResult,
} from "@tgb-resolver/contracts";
import {
  createEmptyShow,
  normalizeShow,
  SHOW_SCHEMA_VERSION,
  type ShowFile,
} from "@tgb-resolver/realtime";

type SnapshotEvent = NonNullable<ShowStateSnapshot["timeline"]>[number];
type SnapshotContest = NonNullable<ShowStateSnapshot["contest"]>;
type ResolveLike = NonNullable<SnapshotEvent["resolve"]>;

function normalizePlaybackStatus(status?: string): PlaybackStatus {
  if (status === PlaybackStatus.RUNNING) return PlaybackStatus.RUNNING;
  if (status === PlaybackStatus.PAUSED) return PlaybackStatus.PAUSED;
  return PlaybackStatus.IDLE;
}

function normalizeShowMode(mode?: string): ShowMode {
  if (mode === ShowMode.LIVE) return ShowMode.LIVE;
  return ShowMode.EDITING;
}

function normalizeTimelineMode(mode?: string): TimelineMode {
  if (mode === TimelineMode.RO) return TimelineMode.RO;
  return TimelineMode.RW;
}

function normalizeShowSource(source?: string): ShowSource {
  if (source === ShowSource.XML) return ShowSource.XML;
  if (source === ShowSource.BUNDLE) return ShowSource.BUNDLE;
  return ShowSource.MANUAL;
}

function mapResolveLikePayload(src: ResolveLike): {
  userId: number;
  problemId: number;
  newTotalScore: number;
  newTotalPenalty: number;
  newRank: number;
  newProblemScore: number;
  verdict: VerdictRunResult;
  timeSinceStart: number;
} {
  return {
    userId: src.userId ?? 0,
    problemId: src.problemId ?? 0,
    newTotalScore: src.newTotalScore ?? 0,
    newTotalPenalty: src.newTotalPenalty ?? 0,
    newRank: src.newRank ?? 0,
    newProblemScore: src.newProblemScore ?? 0,
    verdict: (src.verdict as VerdictRunResult) ?? VerdictRunResult.UNKNOWN,
    timeSinceStart: src.timeSinceStart ?? 0,
  };
}

function mapTimelineBase(event: SnapshotEvent) {
  return {
    id: event.id ?? 0,
    position: event.position ?? event.id ?? 0,
    durationSeconds: event.durationSeconds ?? undefined,
    triggerOffsetSeconds: event.triggerOffsetSeconds ?? undefined,
    requireManualInteraction: event.requireManualInteraction ?? undefined,
    customName: event.customName ?? undefined,
  };
}

function mapResTimelineEvent(event: SnapshotEvent): ShowFile["timeline"][number] | undefined {
  if (event.type !== TimelineEventType.RES) return undefined;
  if (!event.resolve) return undefined;
  return {
    ...mapTimelineBase(event),
    type: TimelineEventType.RES,
    payload: mapResolveLikePayload(event.resolve),
  };
}

function mapPreTimelineEvent(event: SnapshotEvent): ShowFile["timeline"][number] | undefined {
  if (event.type !== TimelineEventType.PRE) return undefined;
  if (!event.pre) return undefined;
  return {
    ...mapTimelineBase(event),
    type: TimelineEventType.PRE,
    payload: mapResolveLikePayload(event.pre),
  };
}

function mapCusTimelineEvent(event: SnapshotEvent): ShowFile["timeline"][number] | undefined {
  if (event.type !== TimelineEventType.CUS) return undefined;
  return {
    ...mapTimelineBase(event),
    type: TimelineEventType.CUS,
    payload: {
      extId: event.custom?.extId ?? "",
      extPayload: event.custom?.extPayload ?? undefined,
    },
  };
}

function mapTimelineEvent(event: SnapshotEvent): ShowFile["timeline"][number] | undefined {
  return mapResTimelineEvent(event) ?? mapPreTimelineEvent(event) ?? mapCusTimelineEvent(event);
}

function mapTimeline(events?: SnapshotEvent[] | null): ShowFile["timeline"] {
  if (!events) return [];
  const timeline: ShowFile["timeline"] = [];
  for (const event of events) {
    const mapped = mapTimelineEvent(event);
    if (mapped) timeline.push(mapped);
  }
  return timeline;
}

function mapMeta(snapshot: ShowStateSnapshot): ShowFile["meta"] {
  return {
    title: snapshot.meta?.title ?? "Untitled show",
    contestId: snapshot.meta?.contestId ?? undefined,
    source: normalizeShowSource(snapshot.meta?.source),
  };
}

function mapContestProblems(contest?: SnapshotContest): ShowFile["contest"]["problems"] {
  return (contest?.problems ?? []).map((problem) => ({
    id: problem.id ?? 0,
    label: problem.label ?? "",
    name: problem.name ?? "",
    score: problem.score ?? 0,
  }));
}

function mapContestUsers(contest?: SnapshotContest): ShowFile["contest"]["users"] {
  return (contest?.users ?? []).map((user) => ({
    id: user.id ?? 0,
    username: user.username ?? "",
    realName: user.realName ?? "",
  }));
}

function mapFreezeProblems(
  problems?: NonNullable<
    NonNullable<SnapshotContest["preFreezeSnapshot"]>[number]["problems"]
  > | null,
): ShowFile["contest"]["preFreezeSnapshot"][number]["problems"] {
  return (problems ?? []).map((problem) => ({
    problemId: problem.problemId ?? 0,
    score: problem.score ?? 0,
    verdict: (problem.verdict as VerdictRunResult) ?? VerdictRunResult.UNKNOWN,
    preFreezeSubmissionCount: problem.preFreezeSubmissionCount ?? 0,
    postFreezeSubmissionCount: problem.postFreezeSubmissionCount ?? 0,
  }));
}

function mapPreFreezeSnapshot(contest?: SnapshotContest): ShowFile["contest"]["preFreezeSnapshot"] {
  return (contest?.preFreezeSnapshot ?? []).map((entry) => ({
    userId: entry.userId ?? 0,
    totalScore: entry.totalScore ?? 0,
    totalPenalty: (entry as { totalPenalty?: number }).totalPenalty ?? 0,
    rank: entry.rank ?? 0,
    problems: mapFreezeProblems(entry.problems),
    lastRunId: entry.lastRunId ?? null,
    lastSubmittedSeconds: entry.lastSubmittedSeconds ?? null,
  }));
}

function mapContest(snapshot: ShowStateSnapshot): ShowFile["contest"] {
  return {
    durationSeconds: snapshot.contest?.durationSeconds ?? 0,
    freezeDurationSeconds: snapshot.contest?.freezeDurationSeconds ?? 0,
    problems: mapContestProblems(snapshot.contest),
    users: mapContestUsers(snapshot.contest),
    preFreezeSnapshot: mapPreFreezeSnapshot(snapshot.contest),
  };
}

function mapAutomation(snapshot: ShowStateSnapshot): ShowFile["automation"] {
  return {
    autoResolveEnabled: snapshot.automation?.autoResolveEnabled ?? false,
    autoResolveSpeedMs: snapshot.automation?.autoResolveSpeedMs ?? 3_000,
    fullAutoEnabled: snapshot.automation?.fullAutoEnabled ?? false,
  };
}

function mapPlayback(snapshot: ShowStateSnapshot): ShowFile["playback"] {
  return {
    status: normalizePlaybackStatus(snapshot.playback?.status),
    currentEventId: snapshot.playback?.currentEventId ?? undefined,
    activeEventIds: snapshot.playback?.activeEventIds ?? [],
    startedAt: snapshot.playback?.startedAt ?? undefined,
  };
}

function mapAssets(snapshot: ShowStateSnapshot): ShowFile["assets"] {
  return {
    folders: (snapshot.assets?.folders ?? []).map((folder) => ({
      ...folder,
      children: folder.children ?? [],
    })),
    items: (snapshot.assets?.items ?? []).map((asset) => ({
      id: asset.id ?? "",
      fileName: asset.fileName ?? "",
      originalName: asset.originalName ?? "",
      contentType: asset.contentType ?? "",
      sizeBytes: asset.sizeBytes ?? 0,
      xxh3: asset.xxh3 ?? "",
      folderId: asset.folderId ?? undefined,
    })),
  };
}

export function mapShowStateSnapshotToShowFile(snapshot: ShowStateSnapshot): ShowFile {
  return normalizeShow(
    createEmptyShow({
      schemaVersion: SHOW_SCHEMA_VERSION,
      showVersion: snapshot.showVersion ?? 0,
      mode: normalizeShowMode(snapshot.mode),
      timelineMode: normalizeTimelineMode(snapshot.timelineMode),
      meta: mapMeta(snapshot),
      contest: mapContest(snapshot),
      automation: mapAutomation(snapshot),
      playback: mapPlayback(snapshot),
      assets: mapAssets(snapshot),
      timeline: mapTimeline(snapshot.timeline),
      tickRate: snapshot.tickRate ?? undefined,
    }),
  );
}
