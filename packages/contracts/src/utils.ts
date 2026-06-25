import {
  type PlaybackSegment,
  type PlaySfxEvent,
  SHOW_SCHEMA_VERSION,
  type ShowAsset,
  type ShowFile,
  type ShowImageEvent,
  type ShowPlaybackState,
  type TimelineEvent,
  type TimelineTableItem,
} from "./types";

export function isResolveEvent(event: TimelineEvent): boolean {
  return event.type === "RES";
}

export function isShowImageEvent(event: TimelineEvent): event is ShowImageEvent {
  return event.type === "IMG";
}

export function isPlaySfxEvent(event: TimelineEvent): event is PlaySfxEvent {
  return event.type === "SFX";
}

export function isNonResolveEvent(event: TimelineEvent): event is ShowImageEvent | PlaySfxEvent {
  return event.type !== "RES";
}

export function createEmptyShow(partial?: Partial<ShowFile>): ShowFile {
  return {
    schemaVersion: SHOW_SCHEMA_VERSION,
    showVersion: 0,
    mode: "editing",
    meta: {
      title: "Untitled show",
      source: "manual",
    },
    contest: {
      durationSeconds: 0,
      freezeDurationSeconds: 0,
      preFreezeSnapshot: [],
    },
    automation: {
      autoResolveEnabled: false,
      autoResolveSpeedMs: 3000,
      fullAutoEnabled: false,
    },
    playback: {
      status: "idle",
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
  return [...timeline].sort((a, b) => a.id - b.id);
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

export function getAssetCollections(show: ShowFile): Record<ShowAsset["kind"], ShowAsset[]> {
  return {
    image: show.assets.images,
    sfx: show.assets.sfx,
  };
}

export function validateShow(show: ShowFile): string[] {
  const issues: string[] = [];
  const eventIds = new Set<number>();
  const assetIds = new Map<string, ShowAsset["kind"]>();
  const snapshotTeamIds = new Set<number>();

  if (show.contest.durationSeconds < 0) {
    issues.push("Contest duration cannot be negative");
  }

  if (show.contest.freezeDurationSeconds < 0) {
    issues.push("Contest freeze duration cannot be negative");
  }

  if (show.contest.freezeDurationSeconds > show.contest.durationSeconds) {
    issues.push("Contest freeze duration cannot exceed contest duration");
  }

  for (const snapshotTeam of show.contest.preFreezeSnapshot) {
    if (snapshotTeamIds.has(snapshotTeam.teamId)) {
      issues.push(`Duplicate contest snapshot team id: ${snapshotTeam.teamId}`);
    }
    snapshotTeamIds.add(snapshotTeam.teamId);
  }

  for (const event of show.timeline) {
    if (eventIds.has(event.id)) {
      issues.push(`Duplicate event id: ${event.id}`);
    }
    eventIds.add(event.id);

    if (event.type === "IMG") {
      if ((event.payload.durationSeconds ?? 0) < 0) {
        issues.push(`Negative duration for image event: ${event.id}`);
      }
      if (!show.assets.images.some((asset) => asset.id === event.payload.imageId)) {
        issues.push(`Missing image asset: ${event.payload.imageId}`);
      }
    }

    if (event.type === "SFX") {
      if ((event.payload.durationSeconds ?? 0) < 0) {
        issues.push(`Negative duration for sfx event: ${event.id}`);
      }
      if (!show.assets.sfx.some((asset) => asset.id === event.payload.sfxId)) {
        issues.push(`Missing sfx asset: ${event.payload.sfxId}`);
      }
    }
  }

  for (const asset of [...show.assets.images, ...show.assets.sfx]) {
    const existingKind = assetIds.get(asset.id);
    if (existingKind) {
      issues.push(`Duplicate asset id: ${asset.id}`);
    } else {
      assetIds.set(asset.id, asset.kind);
    }
  }

  return issues;
}

export function buildPlaybackSegments(show: ShowFile): PlaybackSegment[] {
  const timeline = sortTimeline(show.timeline);
  const resolveIndexes = timeline
    .map((event, index) => (event.type === "RES" ? index : -1))
    .filter((index) => index >= 0);

  return resolveIndexes.map((resolveIndex, segmentIndex) => {
    const resolveEvent = timeline[resolveIndex];
    const nextResolveIndex = resolveIndexes[segmentIndex + 1];
    const segmentTail =
      nextResolveIndex === undefined
        ? timeline.slice(resolveIndex + 1)
        : timeline.slice(resolveIndex + 1, nextResolveIndex);

    return {
      resolveEventId: resolveEvent.id,
      nextResolveEventId:
        nextResolveIndex === undefined ? undefined : timeline[nextResolveIndex].id,
      inlineEvents: segmentTail.filter(isNonResolveEvent),
    };
  });
}

export function getSegmentForResolveEventId(
  show: ShowFile,
  resolveEventId?: number,
): PlaybackSegment | undefined {
  if (resolveEventId === undefined) return undefined;
  return buildPlaybackSegments(show).find((segment) => segment.resolveEventId === resolveEventId);
}

export function optimizeShow(show: ShowFile): ShowFile {
  const normalized = normalizeShow(show);
  const validTimeline = normalized.timeline.filter((event) => {
    if (event.type === "IMG") {
      return normalized.assets.images.some((asset) => asset.id === event.payload.imageId);
    }

    if (event.type === "SFX") {
      return normalized.assets.sfx.some((asset) => asset.id === event.payload.sfxId);
    }

    return true;
  });

  const reIdTimeline = validTimeline.map((event, index) => ({
    ...event,
    id: index + 1,
  }));

  const usedImageIds = new Set(
    reIdTimeline.filter(isShowImageEvent).map((event) => event.payload.imageId),
  );
  const usedSfxIds = new Set(
    reIdTimeline.filter(isPlaySfxEvent).map((event) => event.payload.sfxId),
  );

  return {
    ...normalized,
    timeline: reIdTimeline,
    assets: {
      images: normalized.assets.images.filter((asset) => usedImageIds.has(asset.id)),
      sfx: normalized.assets.sfx.filter((asset) => usedSfxIds.has(asset.id)),
    },
  };
}

export function toTimelineTableItem(
  event: TimelineEvent,
  playback?: ShowPlaybackState,
): TimelineTableItem {
  const activeSegment = playback?.activeSegment;
  const isCurrentResolve = playback?.currentResolveEventId === event.id;
  const isCurrentInlineEvent = playback?.currentEventId === event.id && !isCurrentResolve;
  const isInActiveSegment =
    activeSegment?.resolveEventId === event.id ||
    activeSegment?.inlineEventIds.includes(event.id) ||
    false;

  switch (event.type) {
    case "RES": {
      const resolvePlaceholderName = event.payload.realName ?? event.payload.username;
      return {
        id: event.id,
        type: event.type,
        name: event.customName ?? resolvePlaceholderName,
        customName: event.customName,
        placeholderName: resolvePlaceholderName,
        problem: event.payload.problem,
        newScore: event.payload.newScore,
        newRank: event.payload.newRank,
        triggerOffsetSeconds: event.triggerOffsetSeconds,
        requireManualInteraction: event.requireManualInteraction,
        isCurrentResolve,
        isCurrentInlineEvent,
        isInActiveSegment,
      };
    }
    case "SFX": {
      const sfxPlaceholderName = `Play SFX: ${event.payload.sfxId}`;
      return {
        id: event.id,
        type: event.type,
        name: event.customName ?? sfxPlaceholderName,
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
    case "IMG": {
      const imagePlaceholderName = `Show Image: ${event.payload.imageId}`;
      return {
        id: event.id,
        type: event.type,
        name: event.customName ?? imagePlaceholderName,
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
  }
}

export function toTimelineTableItems(show: ShowFile): TimelineTableItem[] {
  return sortTimeline(show.timeline).map((event) => toTimelineTableItem(event, show.playback));
}
