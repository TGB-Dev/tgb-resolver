import {
  PlaybackStatus,
  ShowMode,
  type ShowStateSnapshot,
  TimelineEventType,
  TimelineMode,
} from "@tgb-resolver/contracts";
import { AssetKind, createEmptyShow, normalizeShow, type ShowFile } from "@tgb-resolver/realtime";

function normalizePlaybackStatus(status?: string): ShowFile["playback"]["status"] {
  switch (status) {
    case "Running":
      return PlaybackStatus.RUNNING;
    case "Paused":
      return PlaybackStatus.PAUSED;
    default:
      return PlaybackStatus.IDLE;
  }
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

    if (event.type === "Res" && event.resolve) {
      timeline.push({
        ...base,
        type: TimelineEventType.RES,
        payload: {
          realName: event.resolve.realName ?? "",
          username: event.resolve.username ?? "",
          problem: event.resolve.problem ?? "",
          newScore: event.resolve.newScore ?? 0,
          newRank: event.resolve.newRank ?? 0,
        },
      });
      continue;
    }

    if (event.type === "Img" && event.image) {
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

    if (event.type === "Sfx" && event.sfx) {
      timeline.push({
        ...base,
        type: TimelineEventType.SFX,
        payload: {
          sfxId: event.sfx.assetId ?? "",
          durationSeconds: event.sfx.durationSeconds ?? undefined,
        },
      });
    }
  }

  return normalizeShow(
    createEmptyShow({
      schemaVersion: 1,
      showVersion: snapshot.showVersion ?? 0,
      mode: snapshot.mode === "Live" ? ShowMode.LIVE : ShowMode.EDITING,
      timelineMode: snapshot.timelineMode === "Ro" ? TimelineMode.RO : TimelineMode.RW,
      meta: {
        title: snapshot.meta?.title ?? "Untitled show",
        contestId: snapshot.meta?.contestId ?? undefined,
        source:
          snapshot.meta?.source === "Xml"
            ? "xml"
            : snapshot.meta?.source === "Bundle"
              ? "bundle"
              : snapshot.meta?.source === "Manual"
                ? "manual"
                : "manual",
      },
      contest: {
        durationSeconds: snapshot.contest?.durationSeconds ?? 0,
        freezeDurationSeconds: snapshot.contest?.freezeDurationSeconds ?? 0,
        preFreezeSnapshot: (snapshot.contest?.preFreezeSnapshot ?? []).map((team) => ({
          teamId: team.teamId ?? 0,
          realName: team.realName ?? "",
          username: team.username ?? "",
          score: team.score ?? 0,
          rank: team.rank ?? 0,
        })),
      },
      automation: {
        autoResolveEnabled: snapshot.automation?.autoResolveEnabled ?? false,
        autoResolveSpeedMs: snapshot.automation?.autoResolveSpeedMs ?? 3_000,
        fullAutoEnabled: snapshot.automation?.fullAutoEnabled ?? false,
      },
      playback: {
        status: normalizePlaybackStatus(snapshot.playback?.status),
        executionSequence: snapshot.playback?.executionSequence ?? 0,
        currentResolveEventId: snapshot.playback?.currentResolveEventId ?? undefined,
        currentEventId: snapshot.playback?.currentEventId ?? undefined,
        activeSegment: snapshot.playback?.activeSegment
          ? {
              resolveEventId: snapshot.playback.activeSegment.resolveEventId ?? 0,
              nextResolveEventId: snapshot.playback.activeSegment.nextResolveEventId ?? undefined,
              inlineEventIds: snapshot.playback.activeSegment.inlineEventIds ?? [],
              currentInlineIndex: snapshot.playback.activeSegment.currentInlineIndex ?? 0,
            }
          : undefined,
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
          xxh364: asset.xxh364 ?? "",
        })),
        sfx: (snapshot.assets?.sfx ?? []).map((asset) => ({
          id: asset.id ?? "",
          kind: AssetKind.Sfx,
          fileName: asset.fileName ?? "",
          originalName: asset.originalName ?? "",
          contentType: asset.contentType ?? "",
          sizeBytes: asset.sizeBytes ?? 0,
          xxh364: asset.xxh364 ?? "",
        })),
      },
      timeline,
    }),
  );
}
