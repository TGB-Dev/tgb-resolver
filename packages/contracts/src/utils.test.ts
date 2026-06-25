import { describe, expect, test } from "vitest";
import type { ShowFile } from "./types";
import {
  buildPlaybackSegments,
  createEmptyShow,
  optimizeShow,
  toTimelineTableItems,
  validateShow,
} from "./utils";

function createSampleShow(): ShowFile {
  return createEmptyShow({
    showVersion: 1000,
    meta: {
      title: "Sample",
      source: "manual",
    },
    contest: {
      durationSeconds: 10800,
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
    assets: {
      images: [
        {
          id: "award-board",
          kind: "image",
          fileName: "award-board.png",
          originalName: "award-board.png",
          contentType: "image/png",
          sizeBytes: 10,
          xxh364: "abc",
        },
      ],
      sfx: [
        {
          id: "drumroll",
          kind: "sfx",
          fileName: "drumroll.mp3",
          originalName: "drumroll.mp3",
          contentType: "audio/mpeg",
          sizeBytes: 20,
          xxh364: "def",
        },
      ],
    },
    playback: {
      status: "running",
      currentResolveEventId: 1,
      currentEventId: 2,
      activeSegment: {
        resolveEventId: 1,
        nextResolveEventId: 4,
        inlineEventIds: [2, 3],
        currentInlineIndex: 0,
      },
      startedAt: 1000,
    },
    timeline: [
      {
        id: 1,
        type: "RES",
        payload: {
          realName: "Alice Team",
          username: "alice",
          problem: "A",
          newScore: 100,
          newRank: 5,
        },
      },
      {
        id: 2,
        type: "SFX",
        payload: {
          sfxId: "drumroll",
          durationSeconds: 3,
        },
      },
      {
        id: 3,
        type: "IMG",
        triggerOffsetSeconds: 2,
        payload: {
          imageId: "award-board",
          durationSeconds: 4,
        },
      },
      {
        id: 4,
        type: "RES",
        customName: "B. Bob",
        payload: {
          realName: "Bob Team",
          username: "bob",
          problem: "B",
          newScore: 200,
          newRank: 2,
        },
      },
    ],
  });
}

describe("contracts utils", () => {
  test("builds resolve-driven playback segments including inline events", () => {
    const show = createSampleShow();

    expect(buildPlaybackSegments(show)).toEqual([
      {
        resolveEventId: 1,
        nextResolveEventId: 4,
        inlineEvents: [
          expect.objectContaining({ id: 2, type: "SFX" }),
          expect.objectContaining({ id: 3, type: "IMG" }),
        ],
      },
      {
        resolveEventId: 4,
        nextResolveEventId: undefined,
        inlineEvents: [],
      },
    ]);
  });

  test("maps timeline rows with duration and playback flags", () => {
    const rows = toTimelineTableItems(createSampleShow());

    expect(rows[0]).toMatchObject({
      id: 1,
      name: "Alice Team",
      placeholderName: "Alice Team",
      type: "RES",
      isCurrentResolve: true,
      isInActiveSegment: true,
    });
    expect(rows[1]).toMatchObject({
      id: 2,
      assetId: "drumroll",
      durationSeconds: 3,
      isCurrentInlineEvent: true,
      isInActiveSegment: true,
    });
    expect(rows[3]).toMatchObject({
      id: 4,
      name: "B. Bob",
      customName: "B. Bob",
      placeholderName: "Bob Team",
      type: "RES",
    });
  });

  test("validates dangling asset references", () => {
    const show = createSampleShow();
    show.timeline.push({
      id: 5,
      type: "IMG",
      payload: {
        imageId: "missing",
      },
    });

    expect(validateShow(show)).toContain("Missing image asset: missing");
  });

  test("validates negative durations on non-resolve events", () => {
    const show = createSampleShow();
    const currentEvent = show.timeline[1];
    if (currentEvent.type !== "SFX") {
      throw new Error("Expected SFX event at index 1");
    }

    show.timeline[1] = {
      ...currentEvent,
      payload: {
        ...currentEvent.payload,
        durationSeconds: -0.25,
      },
    };

    expect(validateShow(show)).toContain("Negative duration for sfx event: 2");
  });

  test("validates contest timing and snapshot integrity", () => {
    const show = createSampleShow();
    show.contest.freezeDurationSeconds = 20000;
    show.contest.preFreezeSnapshot.push({
      teamId: 1,
      realName: "Alice Team Again",
      username: "alice-2",
      score: 50,
      rank: 2,
    });

    expect(validateShow(show)).toContain("Contest freeze duration cannot exceed contest duration");
    expect(validateShow(show)).toContain("Duplicate contest snapshot team id: 1");
  });

  test("optimizes by removing dangling non-resolve events and reassigning ids", () => {
    const show = createSampleShow();
    show.timeline.splice(1, 0, {
      id: 99,
      type: "SFX",
      payload: {
        sfxId: "missing",
      },
    });
    show.timeline[3] = {
      ...show.timeline[3],
      id: 40,
    };

    const optimized = optimizeShow(show);

    expect(optimized.timeline.map((event) => event.id)).toEqual([1, 2, 3, 4]);
    expect(
      optimized.timeline.some((event) => event.type === "SFX" && event.payload.sfxId === "missing"),
    ).toBe(false);
    expect(optimized.assets.images).toHaveLength(1);
    expect(optimized.assets.sfx).toHaveLength(1);
  });
});
