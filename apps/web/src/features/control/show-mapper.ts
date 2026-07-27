import {
  PlaybackStatus,
  ShowMode,
  ShowSource,
  type ShowStateSnapshot,
  TimelineEventType,
  TimelineMode,
  VerdictRunResult,
} from "@tgb-resolver/contracts";
import { AssetKind, createEmptyShow, normalizeShow, type ShowFile } from "@tgb-resolver/realtime";

function normalizePlaybackStatus(status?: string): PlaybackStatus {
  if (status === PlaybackStatus.RUNNING) return PlaybackStatus.RUNNING;
  if (status === PlaybackStatus.PAUSED) return PlaybackStatus.PAUSED;
  return PlaybackStatus.IDLE;
}

export function mapShowStateSnapshotToShowFile(snapshot: ShowStateSnapshot): ShowFile {
  const timeline: ShowFile["timeline"] = [];

  for (const event of snapshot.timeline ?? []) {
    const base = {
      id: event.id ?? 0,
      position: event.position ?? event.id ?? 0,
      triggerOffsetSeconds: event.triggerOffsetSeconds ?? undefined,
      requireManualInteraction: event.requireManualInteraction ?? undefined,
      customName: event.customName ?? undefined,
    };

    if (event.type === TimelineEventType.RES && event.resolve) {
      timeline.push({
        ...base,
        type: TimelineEventType.RES,
        payload: {
          userId: event.resolve.userId ?? 0,
          problemId: event.resolve.problemId ?? 0,
          newTotalScore: event.resolve.newTotalScore ?? 0,
          newTotalPenalty: event.resolve.newTotalPenalty ?? 0,
          newRank: event.resolve.newRank ?? 0,
          newProblemScore: event.resolve.newProblemScore ?? 0,
          verdict: (event.resolve.verdict as VerdictRunResult) ?? VerdictRunResult.UNKNOWN,
          timeSinceStart: event.resolve.timeSinceStart ?? 0,
        },
      });
      continue;
    }

    if (event.type === TimelineEventType.PRE && event.pre) {
      timeline.push({
        ...base,
        type: TimelineEventType.PRE,
        payload: {
          userId: event.pre.userId ?? 0,
          problemId: event.pre.problemId ?? 0,
          newTotalScore: event.pre.newTotalScore ?? 0,
          newTotalPenalty: event.pre.newTotalPenalty ?? 0,
          newRank: event.pre.newRank ?? 0,
          newProblemScore: event.pre.newProblemScore ?? 0,
          verdict: (event.pre.verdict as VerdictRunResult) ?? VerdictRunResult.UNKNOWN,
          timeSinceStart: event.pre.timeSinceStart ?? 0,
        },
      });
      continue;
    }

    if (event.type === TimelineEventType.IMG && event.image) {
      timeline.push({
        ...base,
        type: TimelineEventType.IMG,
        payload: {
          imageId: event.image.assetId ?? "",
          durationSeconds: event.image.durationSeconds ?? undefined,
        },
      });
      continue;
    }

    if (event.type === TimelineEventType.SFX && event.sfx) {
      timeline.push({
        ...base,
        type: TimelineEventType.SFX,
        payload: {
          sfxId: event.sfx.assetId ?? "",
          durationSeconds: event.sfx.durationSeconds ?? undefined,
        },
      });
      continue;
    }

    if (event.type === TimelineEventType.CUS) {
      timeline.push({
        ...base,
        type: TimelineEventType.CUS,
        payload: (event.custom as Record<string, unknown>) ?? {},
      });
    }
  }

  return normalizeShow(
    createEmptyShow({
      schemaVersion: 1,
      showVersion: snapshot.showVersion ?? 0,
      mode: snapshot.mode === ShowMode.LIVE ? ShowMode.LIVE : ShowMode.EDITING,
      timelineMode: snapshot.timelineMode === TimelineMode.RO ? TimelineMode.RO : TimelineMode.RW,
      meta: {
        title: snapshot.meta?.title ?? "Untitled show",
        contestId: snapshot.meta?.contestId ?? undefined,
        source:
          snapshot.meta?.source === ShowSource.XML
            ? ShowSource.XML
            : snapshot.meta?.source === ShowSource.BUNDLE
              ? ShowSource.BUNDLE
              : ShowSource.MANUAL,
      },
      contest: {
        durationSeconds: snapshot.contest?.durationSeconds ?? 0,
        freezeDurationSeconds: snapshot.contest?.freezeDurationSeconds ?? 0,
        problems: (snapshot.contest?.problems ?? []).map((problem) => ({
          id: problem.id ?? 0,
          label: problem.label ?? "",
          name: problem.name ?? "",
          score: problem.score ?? 0,
        })),
        users: (snapshot.contest?.users ?? []).map((user) => ({
          id: user.id ?? 0,
          username: user.username ?? "",
          realName: user.realName ?? "",
        })),
        preFreezeSnapshot: (snapshot.contest?.preFreezeSnapshot ?? []).map((entry) => ({
          userId: entry.userId ?? 0,
          totalScore: entry.totalScore ?? 0,
          totalPenalty: (entry as { totalPenalty?: number }).totalPenalty ?? 0,
          rank: entry.rank ?? 0,
          problems: (entry.problems ?? []).map((problem) => ({
            problemId: problem.problemId ?? 0,
            score: problem.score ?? 0,
            verdict: (problem.verdict as VerdictRunResult) ?? VerdictRunResult.UNKNOWN,
          })),
          lastRunId: entry.lastRunId ?? null,
          lastSubmittedSeconds: entry.lastSubmittedSeconds ?? null,
        })),
      },
      automation: {
        autoResolveEnabled: snapshot.automation?.autoResolveEnabled ?? false,
        autoResolveSpeedMs: snapshot.automation?.autoResolveSpeedMs ?? 3_000,
        fullAutoEnabled: snapshot.automation?.fullAutoEnabled ?? false,
      },
      playback: {
        status: normalizePlaybackStatus(snapshot.playback?.status),
        currentEventId: snapshot.playback?.currentEventId ?? undefined,
        activeEventIds: snapshot.playback?.activeEventIds ?? [],
        startedAt: snapshot.playback?.startedAt ?? undefined,
      },
      assets: {
        images: (snapshot.assets?.images ?? []).map((asset) => ({
          id: asset.id ?? "",
          kind: AssetKind.Image,
          fileName: asset.fileName ?? "",
          originalName: asset.originalName ?? "",
          contentType: asset.contentType ?? "",
          sizeBytes: asset.sizeBytes ?? 0,
          xxh3: asset.xxh3 ?? "",
        })),
        sfx: (snapshot.assets?.sfx ?? []).map((asset) => ({
          id: asset.id ?? "",
          kind: AssetKind.Sfx,
          fileName: asset.fileName ?? "",
          originalName: asset.originalName ?? "",
          contentType: asset.contentType ?? "",
          sizeBytes: asset.sizeBytes ?? 0,
          xxh3: asset.xxh3 ?? "",
        })),
      },
      timeline,
    }),
  );
}
