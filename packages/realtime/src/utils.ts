import {
  type PlaybackSegment,
  PlaybackStatus,
  type PlaySfxEvent,
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

export function isNonResolveEvent(event: TimelineEvent): event is ShowImageEvent | PlaySfxEvent {
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
      const resolvePlaceholderName = event.payload.realName ?? event.payload.username;
      return {
        id: event.id,
        type: event.type,
        name: resolveDisplayName(event.customName, resolvePlaceholderName),
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
    case TimelineEventType.SFX: {
      const sfxPlaceholderName = `Play SFX: ${event.payload.sfxId}`;
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
      const imagePlaceholderName = `Show Image: ${event.payload.imageId}`;
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
  }
}

export function toTimelineTableItems(show: ShowFile): TimelineTableItem[] {
  const initialFromSnapshot = new Map<string, { score: number; rank: number }>();
  for (const team of show.contest.preFreezeSnapshot ?? []) {
    if (team.username && !initialFromSnapshot.has(team.username)) {
      initialFromSnapshot.set(team.username, {
        score: team.score ?? 0,
        rank: team.rank ?? 0,
      });
    }
  }

  const teamStates = new Map(initialFromSnapshot);

  return sortTimeline(show.timeline).map((event) => {
    const item = toTimelineTableItem(event, show.playback);

    if (event.type === TimelineEventType.RES) {
      const username = event.payload.username;
      const previous = teamStates.get(username);
      if (previous) {
        item.oldScore = previous.score;
        item.oldRank = previous.rank;
      }
      teamStates.set(username, {
        score: event.payload.newScore,
        rank: event.payload.newRank,
      });
    }

    return item;
  });
}
