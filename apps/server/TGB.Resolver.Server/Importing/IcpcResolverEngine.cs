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
    var problems = contest.Problem
      .Select((problem, index) =>
        new ProblemDefinition(problem.Id, problem.Label, problem.Score, index))
      .ToArray();
    var problemsById = problems.ToDictionary(problem => problem.Id);
    var runs = contest.Run
      .Where(run => teamIds.Contains(run.Team) && problemsById.ContainsKey(run.Problem)
                                               && run.Time <= durationSeconds)
      .OrderBy(run => run.Id)
      .ToArray();

    var frozen = new Scoreboard(teams, problems, runs);
    foreach (var run in runs.Where(run => run.Time < freezeAtSeconds)) frozen.Apply(run);

    var final = frozen.CreateEmptyClone();
    foreach (var run in runs) final.Apply(run);

    var pending = CreatePendingProblems(frozen, final, teams, problems);
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
        .OrderBy(key => problemsById[key.ProblemId].Order)
        .First();
      var run = pending[pendingProblem];

      resolving.Apply(run);
      pending.Remove(pendingProblem);

      var after = resolving.SnapshotFor(team.TeamId);
      events.Add(new IcpcResolveEvent(
        after.RealName,
        after.Username,
        problemsById[pendingProblem.ProblemId].Label,
        after.Score,
        after.Rank));
    }

    return new IcpcResolution(
      contest.Info.Title,
      contest.Info.ContestId,
      durationSeconds,
      ParseDurationSeconds(contest.Info.ScoreboardFreezeLength),
      frozen.Snapshot(),
      events);
  }

  private static Dictionary<PendingProblem, IcpcXmlRun> CreatePendingProblems(
    Scoreboard frozen,
    Scoreboard final,
    IEnumerable<IcpcXmlTeam> teams,
    IEnumerable<ProblemDefinition> problems)
  {
    var pending = new Dictionary<PendingProblem, IcpcXmlRun>();
    foreach (var team in teams)
    foreach (var problem in problems)
    {
      var frozenResult = frozen.ResultFor(team.Id, problem.Id);
      var finalResult = final.ResultFor(team.Id, problem.Id);
      if (finalResult.LastAlteringRunId is not int finalRunId
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

  private sealed class Scoreboard(
    IEnumerable<IcpcXmlTeam> sourceTeams,
    IEnumerable<ProblemDefinition> sourceProblems,
    IEnumerable<IcpcXmlRun> sourceRuns)
  {
    private readonly IReadOnlyDictionary<int, ProblemDefinition> problems =
      sourceProblems.ToDictionary(problem => problem.Id);

    private readonly Dictionary<ProblemKey, ProblemResult> results = [];

    private readonly IReadOnlyDictionary<int, IcpcXmlRun> runsById =
      sourceRuns.ToDictionary(run => run.Id);

    private readonly IReadOnlyDictionary<ProblemKey, IReadOnlyList<IcpcXmlRun>> runsByProblem =
      sourceRuns.GroupBy(run => new ProblemKey(run.Team, run.Problem))
        .ToDictionary(group => group.Key, group => (IReadOnlyList<IcpcXmlRun>)group.ToArray());

    private readonly IReadOnlyDictionary<int, IcpcXmlTeam> teams =
      sourceTeams.ToDictionary(team => team.Id);

    public void Apply(IcpcXmlRun run)
    {
      var key = new ProblemKey(run.Team, run.Problem);
      var current = ResultFor(key.TeamId, key.ProblemId);
      var points = Math.Min(EffectiveScore(run), problems[key.ProblemId].MaxPoints);

      if (points > current.Points
          || (points == 0 && current.Points == 0))
        results[key] = current with
        {
          Points = Math.Max(current.Points, points), LastAlteringRunId = run.Id
        };
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

    public IReadOnlyList<ContestTeam> Snapshot()
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
        if (team.Score != priorScore || team.PenaltySeconds != priorPenalty)
        {
          rank = index + 1;
          priorScore = team.Score;
          priorPenalty = team.PenaltySeconds;
        }

        return new ContestTeam(team.TeamId, team.RealName, team.Username, team.Score, rank);
      }).ToArray();
    }

    public ContestTeam SnapshotFor(int teamId)
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
      return new ScoreboardTeam(team.Id, team.Name, team.Username, score, penalty);
    }

    private double CalculatePenalty(IEnumerable<(ProblemKey Key, ProblemResult Value)> teamResults)
    {
      var wrongAttempts = 0;
      IcpcXmlRun? finish = null;
      foreach (var (key, result) in teamResults)
      {
        if (result.LastAlteringRunId is not int lastAlteringRunId || result.Points == 0) continue;

        var lastAlteringRun = runsById[lastAlteringRunId];
        wrongAttempts += runsByProblem.GetValueOrDefault(key, [])
          .Count(run => run.Id < lastAlteringRunId);
        if (finish is null || lastAlteringRun.Time > finish.Time
                           || (lastAlteringRun.Time == finish.Time &&
                               lastAlteringRun.Id > finish.Id))
          finish = lastAlteringRun;
      }

      return finish is null ? 0 : finish.Time + WrongAttemptPenaltySeconds * wrongAttempts;
    }

    private double EffectiveScore(IcpcXmlRun run)
    {
      return run.Score == 0 && string.Equals(run.Solved, "true", StringComparison.OrdinalIgnoreCase)
        ? problems[run.Problem].MaxPoints
        : run.Score;
    }
  }

  private readonly record struct ProblemKey(int TeamId, int ProblemId);

  private readonly record struct PendingProblem(int TeamId, int ProblemId);

  private readonly record struct ProblemResult(double Points, int? LastAlteringRunId);

  private sealed record ProblemDefinition(int Id, string Label, double MaxPoints, int Order);

  private sealed record ScoreboardTeam(
    int TeamId,
    string RealName,
    string Username,
    double Score,
    double PenaltySeconds);
}

public sealed record IcpcResolution(
  string Title,
  string ContestId,
  int DurationSeconds,
  int FreezeDurationSeconds,
  IReadOnlyList<ContestTeam> PreFreezeSnapshot,
  IReadOnlyList<IcpcResolveEvent> ResolveEvents);

public sealed record IcpcResolveEvent(
  string RealName,
  string Username,
  string Problem,
  double NewScore,
  int NewRank);