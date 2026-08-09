import type { LeaderboardEntry, LeaderboardProblemResult } from "@tgb-resolver/realtime";

export function problemCellEqual(
  a: LeaderboardProblemResult,
  b: LeaderboardProblemResult,
): boolean {
  return a.score === b.score && a.verdict === b.verdict && a.timeSinceStart === b.timeSinceStart;
}

function problemsEqual(a: LeaderboardProblemResult[], b: LeaderboardProblemResult[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (p, i) =>
      p.problemId === b[i].problemId &&
      p.score === b[i].score &&
      p.verdict === b[i].verdict &&
      p.timeSinceStart === b[i].timeSinceStart,
  );
}

export function entryEqual(a: LeaderboardEntry, b: LeaderboardEntry): boolean {
  if (a.rank !== b.rank || a.totalScore !== b.totalScore || a.totalPenalty !== b.totalPenalty)
    return false;
  if (a.lastSubmittedSeconds !== b.lastSubmittedSeconds) return false;
  return problemsEqual(a.problems, b.problems);
}
