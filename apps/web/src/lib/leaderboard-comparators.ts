import type { LeaderboardEntry, LeaderboardProblemResult } from "@tgb-resolver/realtime";

export function problemCellEqual(
  a: LeaderboardProblemResult,
  b: LeaderboardProblemResult,
): boolean {
  return a.score === b.score && a.verdict === b.verdict;
}

export function problemsEqual(
  a: LeaderboardProblemResult[],
  b: LeaderboardProblemResult[],
): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (p, i) =>
      p.problemId === b[i].problemId && p.score === b[i].score && p.verdict === b[i].verdict,
  );
}

export function entryEqual(a: LeaderboardEntry, b: LeaderboardEntry): boolean {
  if (a.rank !== b.rank || a.totalScore !== b.totalScore || a.totalPenalty !== b.totalPenalty)
    return false;
  return problemsEqual(a.problems, b.problems);
}
