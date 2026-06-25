import {
  createEmptyShow,
  type ResolveEvent,
  SHOW_SCHEMA_VERSION,
  type ShowFile,
} from "@tgb-resolver/contracts";
import type { RawFeedContest, RawFeedRun, RawFeedTeam } from "@tgb-resolver/icpc-xml-parser";

function isJudgedRun(run: RawFeedRun): boolean {
  return run.judged === "True";
}

function getRunTimestamp(run: RawFeedRun): number {
  return Number(run.time ?? run.timestamp ?? 0);
}

function parseDurationToSeconds(value: string): number {
  const [hours = "0", minutes = "0", seconds = "0"] = value.split(":");
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

function buildRankedScores(teams: RawFeedTeam[], teamScores: Map<number, number>) {
  return teams
    .map((team) => ({
      teamId: team.id,
      realName: team.name,
      username: team.username,
      score: teamScores.get(team.id) ?? 0,
    }))
    .sort((left, right) => right.score - left.score || left.teamId - right.teamId)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

export function convertIcpcContestToShow(contest: RawFeedContest): ShowFile {
  const teamsList = contest.team;
  const teams = new Map<number, RawFeedTeam>(teamsList.map((team) => [team.id, team]));
  const problems = new Map(contest.problem.map((problem) => [problem.id, problem]));
  const contestDurationSeconds = parseDurationToSeconds(contest.info.length);
  const freezeDurationSeconds = parseDurationToSeconds(contest.info.scoreboardFreezeLength);
  const freezeStartSeconds = Math.max(0, contestDurationSeconds - freezeDurationSeconds);
  const judgedRuns = contest.run
    .filter(isJudgedRun)
    .sort((a, b) => getRunTimestamp(a) - getRunTimestamp(b));
  const preFreezeJudgedRuns = judgedRuns.filter((run) => getRunTimestamp(run) < freezeStartSeconds);
  const postFreezeJudgedRuns = judgedRuns.filter(
    (run) => getRunTimestamp(run) >= freezeStartSeconds,
  );

  const teamScores = new Map<number, number>();
  const bestProblemScores = new Map<string, number>();

  for (const run of preFreezeJudgedRuns) {
    const problemKey = `${run.team}:${run.problem}`;
    const previousProblemScore = bestProblemScores.get(problemKey) ?? 0;
    const nextProblemScore = Math.max(previousProblemScore, run.score ?? 0);
    if (nextProblemScore <= previousProblemScore) {
      continue;
    }

    bestProblemScores.set(problemKey, nextProblemScore);
    teamScores.set(
      run.team,
      (teamScores.get(run.team) ?? 0) + nextProblemScore - previousProblemScore,
    );
  }

  const preFreezeSnapshot = buildRankedScores(teamsList, teamScores);
  const resolveEvents: ResolveEvent[] = [];

  for (const run of postFreezeJudgedRuns) {
    const team = teams.get(run.team);
    const problem = problems.get(run.problem);
    const problemKey = `${run.team}:${run.problem}`;
    const previousProblemScore = bestProblemScores.get(problemKey) ?? 0;
    const nextProblemScore = Math.max(previousProblemScore, run.score ?? 0);
    if (nextProblemScore <= previousProblemScore) {
      continue;
    }

    bestProblemScores.set(problemKey, nextProblemScore);
    const nextScore = (teamScores.get(run.team) ?? 0) + nextProblemScore - previousProblemScore;
    teamScores.set(run.team, nextScore);

    const rankings = buildRankedScores(teamsList, teamScores);
    const newRank = rankings.find((entry) => entry.teamId === run.team)?.rank ?? rankings.length;

    resolveEvents.push({
      id: resolveEvents.length + 1,
      type: "RES",
      payload: {
        realName: team?.name ?? team?.username ?? `team-${run.team}`,
        username: team?.username ?? `team-${run.team}`,
        problem: problem?.label ?? String(run.problem),
        newScore: nextScore,
        newRank,
      },
    });
  }

  return {
    ...createEmptyShow(),
    schemaVersion: SHOW_SCHEMA_VERSION,
    showVersion: 0,
    meta: {
      title: contest.info.title,
      contestId: contest.info.contestId,
      source: "xml",
    },
    contest: {
      durationSeconds: contestDurationSeconds,
      freezeDurationSeconds,
      preFreezeSnapshot,
    },
    timeline: resolveEvents,
  };
}
