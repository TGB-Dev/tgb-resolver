import { PlaybackStatus } from "@tgb-resolver/contracts";
import { beforeEach, describe, expect, test } from "vitest";

import { playbackModel } from "@/features/control/playback-model";
import { showModel } from "@/features/shared/show-model";

import { animationsModel, shouldSkipSeek } from "./animations-model";

describe("shouldSkipSeek", () => {
  const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  test("returns false for adjacent seeks", () => {
    expect(shouldSkipSeek(ids, 1, 2)).toBe(false);
    expect(shouldSkipSeek(ids, 12, 11)).toBe(false);
  });

  test("returns false below the threshold", () => {
    expect(shouldSkipSeek(ids, 1, 9)).toBe(false);
  });

  test("returns true at exactly the threshold", () => {
    expect(shouldSkipSeek(ids, 1, 11)).toBe(true);
  });

  test("returns true above the threshold", () => {
    expect(shouldSkipSeek(ids, 1, 12)).toBe(true);
  });

  test("uses absolute distance for backward seeks", () => {
    expect(shouldSkipSeek(ids, 12, 1)).toBe(true);
  });

  test("returns true when seeking to null (reset)", () => {
    expect(shouldSkipSeek(ids, 5, null)).toBe(true);
  });

  test("returns false when seeking from null (start)", () => {
    expect(shouldSkipSeek(ids, null, 5)).toBe(false);
  });

  test("returns false when either id is unknown", () => {
    expect(shouldSkipSeek(ids, 99, 5)).toBe(false);
    expect(shouldSkipSeek(ids, 5, 99)).toBe(false);
  });

  test("respects a custom threshold", () => {
    expect(shouldSkipSeek(ids, 1, 4, 3)).toBe(true);
    expect(shouldSkipSeek(ids, 1, 3, 3)).toBe(false);
  });
});

describe("animationsModel", () => {
  const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  beforeEach(() => {
    animationsModel.reset();
    playbackModel.reset();
    showModel.showOrderedIds.value = ids;
  });

  test("is false by default", () => {
    expect(animationsModel.skipNumberAnimations.value).toBe(false);
  });

  test("is true after a far seek", () => {
    playbackModel.syncFromSnapshot(1, {
      status: PlaybackStatus.IDLE,
      currentEventId: 1,
      activeEventIds: [1],
    });
    animationsModel.previousEventId.value = 1;
    playbackModel.syncFromSnapshot(2, {
      status: PlaybackStatus.IDLE,
      currentEventId: 11,
      activeEventIds: [11],
    });

    expect(animationsModel.skipNumberAnimations.value).toBe(true);
  });

  test("is false after an adjacent seek", () => {
    playbackModel.syncFromSnapshot(1, {
      status: PlaybackStatus.IDLE,
      currentEventId: 1,
      activeEventIds: [1],
    });
    animationsModel.previousEventId.value = 1;
    playbackModel.syncFromSnapshot(2, {
      status: PlaybackStatus.IDLE,
      currentEventId: 2,
      activeEventIds: [2],
    });

    expect(animationsModel.skipNumberAnimations.value).toBe(false);
  });

  test("is true when the cursor resets to null", () => {
    playbackModel.syncFromSnapshot(1, {
      status: PlaybackStatus.IDLE,
      currentEventId: 5,
      activeEventIds: [5],
    });
    animationsModel.previousEventId.value = 5;
    playbackModel.syncFromSnapshot(2, {
      status: PlaybackStatus.IDLE,
      currentEventId: null,
      activeEventIds: [],
    });

    expect(animationsModel.skipNumberAnimations.value).toBe(true);
  });

  test("reset clears previousEventId", () => {
    animationsModel.previousEventId.value = 3;
    animationsModel.reset();

    expect(animationsModel.previousEventId.value).toBeNull();
  });
});
