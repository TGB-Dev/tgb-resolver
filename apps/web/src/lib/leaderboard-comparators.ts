import type { LeaderboardEntry, LeaderboardProblemResult } from "@tgb-resolver/realtime";

function problemCellEqual(a: LeaderboardProblemResult, b: LeaderboardProblemResult) {
  return a.score === b.score && a.verdict === b.verdict && a.timeSinceStart === b.timeSinceStart;
}
export function entryEqual(a: LeaderboardEntry, b: LeaderboardEntry) {
  return (
    a.rank === b.rank &&
    a.totalScore === b.totalScore &&
    a.totalPenalty === b.totalPenalty &&
    a.lastSubmittedSeconds === b.lastSubmittedSeconds &&
    a.problems.length === b.problems.length &&
    a.problems.every((p, i) => {
      const q = b.problems[i];
      return q !== undefined && p.problemId === q.problemId && problemCellEqual(p, q);
    })
  );
}
