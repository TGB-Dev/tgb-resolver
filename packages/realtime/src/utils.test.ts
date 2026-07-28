import { describe, expect, test } from "vitest";

import { TimelineEventType, VerdictRunResult } from "./types";
import { createEmptyShow, deriveLeaderboard } from "./utils";

describe("deriveLeaderboard", () => {
  test("never produces duplicate userIds, even with multiple resolves per user", () => {
    const show = createEmptyShow({
      contest: {
        durationSeconds: 5000,
        freezeDurationSeconds: 500,
        problems: [
          { id: 1, label: "A", name: "Problem A", score: 100 },
          { id: 2, label: "B", name: "Problem B", score: 100 },
          { id: 3, label: "C", name: "Problem C", score: 100 },
        ],
        users: [
          { id: 1, username: "user1", realName: "User One" },
          { id: 2, username: "user2", realName: "User Two" },
        ],
        preFreezeSnapshot: [
          {
            userId: 1,
            totalScore: 100,
            totalPenalty: 1200,
            rank: 2,
            problems: [{ problemId: 1, score: 100, verdict: VerdictRunResult.ACCEPTED }],
            lastRunId: null,
            lastSubmittedSeconds: null,
          },
          {
            userId: 2,
            totalScore: 200,
            totalPenalty: 2400,
            rank: 1,
            problems: [
              { problemId: 1, score: 100, verdict: VerdictRunResult.ACCEPTED },
              { problemId: 2, score: 100, verdict: VerdictRunResult.ACCEPTED },
            ],
            lastRunId: null,
            lastSubmittedSeconds: null,
          },
        ],
      },
      timeline: [
        {
          id: 1,
          position: 1,
          type: TimelineEventType.PRE,
          payload: {
            userId: 1,
            problemId: 2,
            newTotalScore: 100,
            newTotalPenalty: 1200,
            newRank: 2,
            newProblemScore: 0,
            verdict: VerdictRunResult.UNKNOWN,
            timeSinceStart: 900,
          },
        },
        {
          id: 2,
          position: 2,
          type: TimelineEventType.RES,
          payload: {
            userId: 1,
            problemId: 2,
            newTotalScore: 200,
            newTotalPenalty: 1500,
            newRank: 2,
            newProblemScore: 100,
            verdict: VerdictRunResult.ACCEPTED,
            timeSinceStart: 950,
          },
        },
        {
          id: 3,
          position: 3,
          type: TimelineEventType.PRE,
          payload: {
            userId: 1,
            problemId: 3,
            newTotalScore: 200,
            newTotalPenalty: 1500,
            newRank: 2,
            newProblemScore: 0,
            verdict: VerdictRunResult.UNKNOWN,
            timeSinceStart: 1400,
          },
        },
        {
          id: 4,
          position: 4,
          type: TimelineEventType.RES,
          payload: {
            userId: 1,
            problemId: 3,
            newTotalScore: 300,
            newTotalPenalty: 1800,
            newRank: 1,
            newProblemScore: 100,
            verdict: VerdictRunResult.ACCEPTED,
            timeSinceStart: 1450,
          },
        },
        {
          id: 5,
          position: 5,
          type: TimelineEventType.PRE,
          payload: {
            userId: 2,
            problemId: 3,
            newTotalScore: 200,
            newTotalPenalty: 2400,
            newRank: 2,
            newProblemScore: 0,
            verdict: VerdictRunResult.UNKNOWN,
            timeSinceStart: 1900,
          },
        },
        {
          id: 6,
          position: 6,
          type: TimelineEventType.RES,
          payload: {
            userId: 2,
            problemId: 3,
            newTotalScore: 300,
            newTotalPenalty: 2700,
            newRank: 1,
            newProblemScore: 100,
            verdict: VerdictRunResult.ACCEPTED,
            timeSinceStart: 1950,
          },
        },
      ],
    });

    // Simulate progressive calls like real-time playback would do
    for (let upTo = 0; upTo <= 6; upTo++) {
      const leaderboard = deriveLeaderboard(show, upTo);
      const userIds = leaderboard.map((e) => e.userId);
      const unique = new Set(userIds);
      expect(userIds.length, `duplicate userIds at upTo=${upTo}: ${JSON.stringify(userIds)}`).toBe(
        unique.size,
      );
    }
  });

  test("sorts tied scores by lower penalty first", () => {
    const show = createEmptyShow({
      contest: {
        durationSeconds: 0,
        freezeDurationSeconds: 0,
        problems: [{ id: 1, label: "A", name: "Problem A", score: 100 }],
        users: [
          { id: 1, username: "alice", realName: "Alice" },
          { id: 2, username: "bob", realName: "Bob" },
        ],
        preFreezeSnapshot: [
          {
            userId: 1,
            totalScore: 100,
            totalPenalty: 10,
            rank: 1,
            problems: [],
            lastRunId: null,
            lastSubmittedSeconds: null,
          },
          {
            userId: 2,
            totalScore: 100,
            totalPenalty: 0,
            rank: 2,
            problems: [],
            lastRunId: null,
            lastSubmittedSeconds: null,
          },
        ],
      },
      timeline: [
        {
          id: 1,
          position: 1,
          type: TimelineEventType.RES,
          payload: {
            userId: 2,
            problemId: 1,
            newTotalScore: 100,
            newTotalPenalty: 0,
            newRank: 1,
            newProblemScore: 100,
            verdict: VerdictRunResult.ACCEPTED,
            timeSinceStart: 1,
          },
        },
      ],
    });

    const leaderboard = deriveLeaderboard(show);

    expect(leaderboard.map((entry) => entry.userId)).toEqual([2, 1]);
    expect(leaderboard[0]?.totalPenalty).toBe(0);
    expect(leaderboard[1]?.totalPenalty).toBe(10);
  });
});
