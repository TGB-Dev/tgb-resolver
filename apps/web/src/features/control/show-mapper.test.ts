import {
  PlaybackStatus,
  ShowMode,
  ShowSource,
  type ShowStateSnapshot,
  TimelineEventType,
  VerdictRunResult,
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
        problems: [{ id: 1, label: "A", name: "Thế Giới Âm Nhạc", score: 100 }],
        users: [{ id: 1, username: "alice", realName: "Alice Team" }],
        preFreezeSnapshot: [
          {
            userId: 1,
            totalScore: 100,
            totalPenalty: 0,
            rank: 1,
            problems: [{ problemId: 1, score: 100, verdict: VerdictRunResult.ACCEPTED }],
            lastRunId: 5,
            lastSubmittedSeconds: 12,
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
            userId: 1,
            problemId: 1,
            newTotalScore: 100,
            newTotalPenalty: 0,
            newRank: 1,
            newProblemScore: 100,
            verdict: VerdictRunResult.ACCEPTED,
            timeSinceStart: 12,
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
      contest: {
        preFreezeSnapshot: [
          expect.objectContaining({
            userId: 1,
            totalScore: 100,
            rank: 1,
            problems: [{ problemId: 1, score: 100, verdict: VerdictRunResult.ACCEPTED }],
          }),
        ],
      },
    });
    expect(show.timeline).toEqual([
      expect.objectContaining({
        id: 10,
        type: TimelineEventType.RES,
        customName: "A. Alice",
        payload: expect.objectContaining({
          userId: 1,
          problemId: 1,
          newTotalScore: 100,
          newRank: 1,
          newProblemScore: 100,
          verdict: VerdictRunResult.ACCEPTED,
          timeSinceStart: 12,
        }),
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
