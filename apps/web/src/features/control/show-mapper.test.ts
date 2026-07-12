import {
  PlaybackStatus,
  ShowMode,
  ShowSource,
  type ShowStateSnapshot,
  TimelineEventType,
} from "@tgb-resolver/contracts";
import { describe, expect, test } from "vitest";

import { mapShowStateSnapshotToShowFile } from "./show-mapper";

describe("mapShowStateSnapshotToShowFile", () => {
  test("normalizes a server snapshot into the UI show model", () => {
    const snapshot: ShowStateSnapshot = {
      schemaVersion: 1,
      showVersion: 3,
      mode: ShowMode.LIVE,
      meta: {
        title: "Demo Show",
        contestId: "demo-1",
        source: ShowSource.XML,
      },
      contest: {
        durationSeconds: 18_000,
        freezeDurationSeconds: 900,
        preFreezeSnapshot: [
          {
            teamId: 1,
            realName: "Alice Team",
            username: "alice",
            score: 100,
            rank: 1,
          },
        ],
      },
      automation: {
        autoResolveEnabled: true,
        autoResolveSpeedMs: 1_500,
        fullAutoEnabled: false,
      },
      playback: {
        status: PlaybackStatus.RUNNING,
        currentResolveEventId: 10,
        currentEventId: 11,
        activeSegment: {
          resolveEventId: 10,
          nextResolveEventId: 12,
          inlineEventIds: [11],
          currentInlineIndex: 0,
        },
        startedAt: 12345,
      },
      assets: {
        images: [
          {
            id: "hero",
            kind: "image",
            fileName: "hero.png",
            originalName: "hero.png",
            contentType: "image/png",
            sizeBytes: 100,
            xxh364: "abc",
          },
        ],
        sfx: [],
      },
      timeline: [
        {
          id: 10,
          type: TimelineEventType.RES,
          customName: "A. Alice",
          resolve: {
            realName: "Alice Team",
            username: "alice",
            problem: "A",
            newScore: 100,
            newRank: 1,
          },
        },
        {
          id: 11,
          type: TimelineEventType.SFX,
          sfx: {
            assetId: "sting",
            durationSeconds: 2,
          },
        },
      ],
    };

    const show = mapShowStateSnapshotToShowFile(snapshot);

    expect(show).toMatchObject({
      showVersion: 3,
      mode: ShowMode.LIVE,
      meta: {
        title: "Demo Show",
        contestId: "demo-1",
        source: ShowSource.XML,
      },
      playback: {
        status: PlaybackStatus.RUNNING,
        currentResolveEventId: 10,
        currentEventId: 11,
      },
    });
    expect(show.timeline).toEqual([
      expect.objectContaining({
        id: 10,
        type: TimelineEventType.RES,
        customName: "A. Alice",
      }),
      expect.objectContaining({
        id: 11,
        type: TimelineEventType.SFX,
        payload: expect.objectContaining({
          sfxId: "sting",
          durationSeconds: 2,
        }),
      }),
    ]);
  });
});
