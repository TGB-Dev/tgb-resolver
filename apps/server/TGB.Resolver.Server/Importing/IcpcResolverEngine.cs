using System.Globalization;
using TGB.Resolver.IcpcXmlParser;
using TGB.Resolver.Server.Features.Show.Data;
using IcpcParser = TGB.Resolver.IcpcXmlParser.IcpcXmlParser;

namespace TGB.Resolver.Server.Importing;

public static class IcpcResolverEngine
{
  private const int WrongAttemptPenaltySeconds = 300;

  public static IcpcResolution Convert(
    string xml,
    IReadOnlyCollection<string>? excludedUsernames = null)
  {
    var contest = IcpcParser.Parse(xml);
    var excluded = new HashSet<string>(excludedUsernames ?? [], StringComparer.Ordinal);
    var teams = contest.Team
      .Where(team => !excluded.Contains(team.Username))
      .OrderBy(team => team.Id)
      .ToArray();
    var teamIds = teams.Select(team => team.Id).ToHashSet();
    var durationSeconds = ParseDurationSeconds(contest.Info.Length);
    var freezeAtSeconds =
      durationSeconds - ParseDurationSeconds(contest.Info.ScoreboardFreezeLength);
    var problemDefs = contest.Problem
      .Select(problem =>
        new ProblemDefinition(problem.Id, problem.Label, problem.Name, problem.Score))
      .ToArray();
    var problemsById = problemDefs.ToDictionary(problem => problem.Id);
    var problemOrder = contest.Problem
      .Select((problem, index) => (problem.Id, index))
      .ToDictionary(x => x.Id, x => x.index);
    var users = teams
      .Select(team => new UserDefinition(team.Id, team.Username, team.Name))
      .ToArray();
    var runs = contest.Run
      .Where(run => teamIds.Contains(run.Team) && problemsById.ContainsKey(run.Problem)
                                               && run.Time <= durationSeconds)
      .OrderBy(run => run.Id)
      .ToArray();

    var frozen = new Scoreboard(teams, problemDefs, runs);
    foreach (var run in runs.Where(run => run.Time < freezeAtSeconds)) frozen.Apply(run);

    var final = frozen.CreateEmptyClone();
    foreach (var run in runs) final.Apply(run);

    var pending = CreatePendingProblems(frozen, final, teams, problemDefs);
    var resolving = frozen.Clone();
    var events = new List<IcpcResolveEvent>(pending.Count);

    // ICPC's resolver walks the current standings from the bottom. VNOI's
    // scorer supplies the point/penalty state; each pending problem resolves
    // to its final score-altering run.
    while (pending.Count > 0)
    {
      var team = resolving.Snapshot()
        .Last(snapshot => pending.Keys.Any(key => key.TeamId == snapshot.TeamId));
      var pendingProblem = pending.Keys
        .Where(key => key.TeamId == team.TeamId)
        .OrderBy(key => problemOrder[key.ProblemId])
        .First();
      var run = pending[pendingProblem];

      resolving.Apply(run);
      pending.Remove(pendingProblem);

      var after = resolving.SnapshotFor(team.TeamId);
      var problemScore = resolving.ResultFor(run.Team, run.Problem).Points;
      events.Add(new IcpcResolveEvent(
        run.Team,
        run.Problem,
        after.Score,
        after.Rank,
        problemScore,
        run.Verdict,
        run.Time));
    }

    var preFreeze = teams.Select(team =>
    {
      var problemResults = problemDefs.Select(problemDef =>
      {
        var result = frozen.ResultFor(team.Id, problemDef.Id);
        var verdict = VerdictRunResult.Unknown;
        if (result.LastAlteringRunId is { } runId && frozen.RunById(runId) is { } run)
          verdict = run.Verdict;
        return new ProblemFreezeResult(problemDef.Id, result.Points, verdict);
      }).ToArray();

      var lastRun = runs
        .Where(run => run.Team == team.Id && run.Time < freezeAtSeconds)
        .OrderBy(run => run.Time)
        .ThenBy(run => run.Id)
        .LastOrDefault();

      var standing = frozen.SnapshotFor(team.Id);
      return new FreezeSnapshotEntry(
        team.Id,
        standing.Score,
        standing.Rank,
        problemResults,
        lastRun?.Id,
        lastRun?.Time);
    }).ToArray();

    return new IcpcResolution(
      contest.Info.Title,
      contest.Info.ContestId,
      durationSeconds,
      ParseDurationSeconds(contest.Info.ScoreboardFreezeLength),
      problemDefs,
      users,
      preFreeze,
      events);
  }

  private static Dictionary<PendingProblem, IcpcXmlRun> CreatePendingProblems(
    Scoreboard frozen,
    Scoreboard final,
    IEnumerable<IcpcXmlTeam> teams,
    IEnumerable<ProblemDefinition> problems)
  {
    var pending = new Dictionary<PendingProblem, IcpcXmlRun>();
    var teamList = teams.ToArray();
    var problemList = problems.ToArray();
    foreach (var team in teamList)
    foreach (var problem in problemList)
    {
      var frozenResult = frozen.ResultFor(team.Id, problem.Id);
      var finalResult = final.ResultFor(team.Id, problem.Id);
      if (finalResult.LastAlteringRunId is not { } finalRunId
          || frozenResult.LastAlteringRunId == finalRunId)
        continue;

      pending.Add(new PendingProblem(team.Id, problem.Id), final.RunById(finalRunId));
    }

    return pending;
  }

  private static int ParseDurationSeconds(string value)
  {
    return TimeSpan.TryParse(value, CultureInfo.InvariantCulture, out var duration)
      ? (int)duration.TotalSeconds
      : 0;
  }

  private sealed class Scoreboard
  {
    private readonly IReadOnlyDictionary<int, ProblemDefinition> problems;
    private readonly Dictionary<ProblemKey, ProblemResult> results = [];
    private readonly IReadOnlyDictionary<int, IcpcXmlRun> runsById;
    private readonly IReadOnlyDictionary<ProblemKey, IReadOnlyList<IcpcXmlRun>> runsByProblem;
    private readonly IReadOnlyDictionary<int, IcpcXmlTeam> teams;

    public Scoreboard(
      IEnumerable<IcpcXmlTeam> sourceTeams,
      IEnumerable<ProblemDefinition> sourceProblems,
      IEnumerable<IcpcXmlRun> sourceRuns)
    {
      problems = sourceProblems.ToDictionary(problem => problem.Id);
      teams = sourceTeams.ToDictionary(team => team.Id);

      var runs = sourceRuns.ToArray();
      runsById = runs.ToDictionary(run => run.Id);
      runsByProblem = runs
        .GroupBy(run => new ProblemKey(run.Team, run.Problem))
        .ToDictionary(group => group.Key, group => (IReadOnlyList<IcpcXmlRun>)group.ToArray());
    }

    public void Apply(IcpcXmlRun run)
    {
      var key = new ProblemKey(run.Team, run.Problem);
      var current = ResultFor(key.TeamId, key.ProblemId);
      var points = Math.Min(EffectiveScore(run), problems[key.ProblemId].Score);

      if (points > current.Points
          || (points == 0 && current.Points == 0))
        results[key] = new ProblemResult(
          Math.Max(current.Points, points), run.Id);
    }

    public Scoreboard Clone()
    {
      var clone = CreateEmptyClone();
      foreach (var (key, result) in results) clone.results[key] = result;
      return clone;
    }

    public Scoreboard CreateEmptyClone()
    {
      return new Scoreboard(teams.Values, problems.Values, runsById.Values);
    }

    public ProblemResult ResultFor(int teamId, int problemId)
    {
      return results.GetValueOrDefault(new ProblemKey(teamId, problemId));
    }

    public IcpcXmlRun RunById(int id)
    {
      return runsById[id];
    }

    public IReadOnlyList<TeamStanding> Snapshot()
    {
      var ordered = teams.Values
        .Select(ToSnapshotTeam)
        .OrderByDescending(team => team.Score)
        .ThenBy(team => team.PenaltySeconds)
        .ThenBy(team => team.TeamId)
        .ToArray();
      var rank = 0;
      double? priorScore = null;
      double? priorPenalty = null;

      return ordered.Select((team, index) =>
      {
        if (priorScore is null || Math.Abs(team.Score - priorScore.Value) > 1e-9
                               || priorPenalty is null ||
                               Math.Abs(team.PenaltySeconds - priorPenalty.Value) > 1e-9)
        {
          rank = index + 1;
          priorScore = team.Score;
          priorPenalty = team.PenaltySeconds;
        }

        return new TeamStanding(team.TeamId, team.Score, rank);
      }).ToArray();
    }

    public TeamStanding SnapshotFor(int teamId)
    {
      return Snapshot().Single(team => team.TeamId == teamId);
    }

    private ScoreboardTeam ToSnapshotTeam(IcpcXmlTeam team)
    {
      var teamResults = results
        .Where(entry => entry.Key.TeamId == team.Id)
        .Select(entry => (entry.Key, entry.Value))
        .ToArray();
      var score = teamResults.Sum(entry => entry.Value.Points);
      var penalty = CalculatePenalty(teamResults);
      return new ScoreboardTeam(team.Id, score, penalty);
    }

    private double CalculatePenalty(IEnumerable<(ProblemKey Key, ProblemResult Value)> teamResults)
    {
      var wrongAttempts = 0;
      IcpcXmlRun? finish = null;
      foreach (var (key, result) in teamResults)
      {
        if (result.LastAlteringRunId is not { } lastAlteringRunId || result.Points == 0) continue;

        var lastAlteringRun = runsById[lastAlteringRunId];
        wrongAttempts += runsByProblem.GetValueOrDefault(key, [])
          .Count(run => run.Id < lastAlteringRunId);
        if (finish is null || lastAlteringRun.Time > finish.Time
                           || (Math.Abs(lastAlteringRun.Time - finish.Time) <= 1e-9 &&
                               lastAlteringRun.Id > finish.Id))
          finish = lastAlteringRun;
      }

      return finish is null ? 0 : finish.Time + WrongAttemptPenaltySeconds * wrongAttempts;
    }

    private double EffectiveScore(IcpcXmlRun run)
    {
      return run.Score == 0 && string.Equals(run.Solved, "true", StringComparison.OrdinalIgnoreCase)
        ? problems[run.Problem].Score
        : run.Score;
    }
  }

  private readonly record struct ProblemKey(int TeamId, int ProblemId);

  private readonly record struct PendingProblem(int TeamId, int ProblemId);

  private readonly record struct ProblemResult(double Points, int? LastAlteringRunId);

  private sealed record ScoreboardTeam(
    int TeamId,
    double Score,
    double PenaltySeconds);

  private sealed record TeamStanding(int TeamId, double Score, int Rank);
}

public sealed record IcpcResolution(
  string Title,
  string ContestId,
  int DurationSeconds,
  int FreezeDurationSeconds,
  IReadOnlyList<ProblemDefinition> Problems,
  IReadOnlyList<UserDefinition> Users,
  IReadOnlyList<FreezeSnapshotEntry> PreFreezeSnapshot,
  IReadOnlyList<IcpcResolveEvent> ResolveEvents);

public sealed record IcpcResolveEvent(
  int UserId,
  int ProblemId,
  double NewTotalScore,
  int NewRank,
  double NewProblemScore,
  VerdictRunResult Verdict,
  double SubmissionSeconds);