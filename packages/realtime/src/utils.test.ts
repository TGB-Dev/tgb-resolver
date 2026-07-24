import { describe, expect, test } from "vitest";

import { TimelineEventType, VerdictRunResult } from "./types";
import { createEmptyShow, deriveLeaderboard } from "./utils";

describe("deriveLeaderboard", () => {
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
