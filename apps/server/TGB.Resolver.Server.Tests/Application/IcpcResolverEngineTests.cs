using System.Globalization;
using System.Xml.Linq;
using TGB.Resolver.IcpcXmlParser;
using TGB.Resolver.Server.Features.Show.Data;
using TGB.Resolver.Server.Importing;

namespace TGB.Resolver.Server.Tests.Application;

public sealed class IcpcResolverEngineTests
{
  // Produced by VNOI's buildInitialState(), rankUsers(), and default reveal
  // reducer after translating this real DMOJ XML fixture. Usernames map to the
  // XML team <id> (CONTEST_N -> N) and problem labels to the <id> (A=1..F=6).
  private static readonly ExpectedTeam[] ExpectedFrozenBoard =
  [
    new("CONTEST_5", 550, 1), new("CONTEST_15", 437.5, 2),
    new("CONTEST_35", 427.5, 3), new("CONTEST_4", 401.25, 4),
    new("CONTEST_27", 385, 5), new("CONTEST_44", 350, 6),
    new("CONTEST_43", 321.25, 7), new("CONTEST_49", 313.75, 8),
    new("CONTEST_25", 278.75, 9), new("CONTEST_54", 268.75, 10),
    new("CONTEST_34", 235, 11), new("CONTEST_52", 235, 12),
    new("CONTEST_22", 227.5, 13), new("CONTEST_31", 226.25, 14),
    new("CONTEST_7", 226.25, 15), new("CONTEST_53", 220, 16),
    new("CONTEST_14", 216.25, 17), new("CONTEST_28", 208.75, 18),
    new("CONTEST_50", 200, 19), new("CONTEST_36", 181.25, 20),
    new("CONTEST_12", 175, 21), new("CONTEST_48", 167.5, 22),
    new("CONTEST_26", 156.25, 23), new("CONTEST_21", 145, 24),
    new("CONTEST_18", 145, 25), new("CONTEST_8", 145, 26),
    new("CONTEST_47", 126.25, 27), new("CONTEST_39", 126.25, 28),
    new("CONTEST_40", 126.25, 29), new("CONTEST_30", 126.25, 30),
    new("CONTEST_51", 118.75, 31), new("CONTEST_37", 118.75, 32),
    new("CONTEST_13", 118.75, 33), new("CONTEST_19", 118.75, 34),
    new("CONTEST_38", 118.75, 35), new("CONTEST_33", 118.75, 36),
    new("CONTEST_6", 118.75, 37), new("CONTEST_45", 118.75, 38),
    new("CONTEST_23", 100, 39), new("CONTEST_11", 100, 40),
    new("CONTEST_41", 100, 41), new("CONTEST_9", 100, 42),
    new("CONTEST_2", 100, 43), new("CONTEST_3", 100, 44),
    new("CONTEST_10", 100, 45), new("CONTEST_29", 100, 46),
    new("CONTEST_17", 100, 47), new("CONTEST_16", 58, 48),
    new("CONTEST_32", 41, 49), new("CONTEST_20", 21, 50),
    new("CONTEST_46", 18, 51), new("CONTEST_24", 1, 52),
    new("CONTEST_42", 0, 53)
  ];

  private static readonly ExpectedResolveEvent[] ExpectedResolveEvents =
  [
    new(42, 6, 0, 53, VerdictRunResult.WrongAnswer),
    new(46, 1, 32, 50, VerdictRunResult.TimeLimitExceeded),
    new(20, 2, 21, 51, VerdictRunResult.WrongAnswer),
    new(32, 6, 41, 49, VerdictRunResult.WrongAnswer),
    new(17, 6, 100, 47, VerdictRunResult.WrongAnswer),
    new(3, 6, 100, 44, VerdictRunResult.WrongAnswer),
    new(9, 2, 118.75, 39, VerdictRunResult.WrongAnswer),
    new(11, 3, 100, 41, VerdictRunResult.TimeLimitExceeded),
    new(23, 2, 118.75, 40, VerdictRunResult.TimeLimitExceeded),
    new(23, 6, 118.75, 40, VerdictRunResult.WrongAnswer),
    new(9, 4, 118.75, 39, VerdictRunResult.TimeLimitExceeded),
    new(45, 6, 118.75, 38, VerdictRunResult.WrongAnswer),
    new(6, 6, 118.75, 37, VerdictRunResult.WrongAnswer),
    new(33, 6, 118.75, 36, VerdictRunResult.WrongAnswer),
    new(38, 6, 118.75, 35, VerdictRunResult.WrongAnswer),
    new(13, 3, 118.75, 33, VerdictRunResult.RuntimeError),
    new(30, 3, 126.25, 30, VerdictRunResult.RuntimeError),
    new(40, 3, 126.25, 29, VerdictRunResult.TimeLimitExceeded),
    new(39, 6, 126.25, 28, VerdictRunResult.WrongAnswer),
    new(8, 6, 145, 26, VerdictRunResult.WrongAnswer),
    new(18, 3, 145, 25, VerdictRunResult.TimeLimitExceeded),
    new(18, 6, 145, 25, VerdictRunResult.WrongAnswer),
    new(21, 3, 145, 24, VerdictRunResult.TimeLimitExceeded),
    new(26, 2, 156.25, 23, VerdictRunResult.WrongAnswer),
    new(26, 3, 216.25, 18, VerdictRunResult.TimeLimitExceeded),
    new(12, 6, 175, 22, VerdictRunResult.WrongAnswer),
    new(50, 3, 200, 20, VerdictRunResult.TimeLimitExceeded),
    new(28, 4, 208.75, 19, VerdictRunResult.WrongAnswer),
    new(26, 6, 216.25, 18, VerdictRunResult.WrongAnswer),
    new(14, 6, 216.25, 17, VerdictRunResult.WrongAnswer),
    new(53, 4, 255, 11, VerdictRunResult.TimeLimitExceeded),
    new(7, 3, 226.25, 16, VerdictRunResult.TimeLimitExceeded),
    new(7, 6, 226.25, 16, VerdictRunResult.WrongAnswer),
    new(34, 6, 235, 12, VerdictRunResult.WrongAnswer),
    new(44, 4, 350, 6, VerdictRunResult.WrongAnswer),
    new(44, 6, 350, 6, VerdictRunResult.WrongAnswer),
    new(27, 4, 437.5, 3, VerdictRunResult.TimeLimitExceeded),
    new(4, 4, 427.5, 5, VerdictRunResult.RuntimeError),
    new(35, 4, 506.25, 2, VerdictRunResult.Accepted)
  ];

  [Test]
  public async Task Convert_MatchesTheVnoiFrozenBoardAndRevealSequence()
  {
    var xml = await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "Fixtures",
      "sample.xml"));
    var result = IcpcResolverEngine.Convert(xml, ["CONTEST_1"]);

    await AssertTeams(result.PreFreezeSnapshot, ExpectedFrozenBoard);
    await AssertSubmissionCounts(result.PreFreezeSnapshot);
    await AssertEvents(result.ResolveEvents, ExpectedResolveEvents);
  }

  [Test]
  public async Task Convert_AccumulatesWrongAttemptPenaltyFromXml()
  {
    var doc = await LoadSampleAsync();
    doc.Descendants("info").Single().Element("penalty")!.Value = "1";
    doc.Root!.Elements("team").Where(team => !new[] { 5, 15 }.Contains((int)team.Element("id")!))
      .Remove();
    doc.Root!.Elements("problem").Where(problem => (int)problem.Element("id")! != 1).Remove();
    doc.Root!.Elements("run")
      .Where(run => !new[] { 3717, 3710, 3714 }.Contains((int)run.Element("id")!)).Remove();
    doc.Descendants("scoreboard-freeze-length").Single().Value = "0:00:00";

    var result = IcpcResolverEngine.Convert(doc.ToString());

    // Run times are floored to whole seconds by the parser (Time) while the
    // raw value lives in SubmissionSecondsSinceStart. Team 15: WA at 120 then
    // AC at 178 -> finish 178 + 1 wrong attempt * 60s = 238.
    var team15 = result.PreFreezeSnapshot.Single(entry => entry.UserId == 15);
    await Assert.That(team15.TotalPenalty).IsEqualTo(238);
    // Team 5: single AC at 186 -> no wrong attempts.
    var team5 = result.PreFreezeSnapshot.Single(entry => entry.UserId == 5);
    await Assert.That(team5.TotalPenalty).IsEqualTo(186);
  }

  [Test]
  public async Task Convert_EmptyInput_ProducesEmptyResolution()
  {
    var doc = await LoadSampleAsync();
    doc.Root!.Elements("team").Remove();
    doc.Root!.Elements("problem").Remove();
    doc.Root!.Elements("run").Remove();

    var result = IcpcResolverEngine.Convert(doc.ToString());

    await Assert.That(result.DurationSeconds).IsEqualTo(11_100);
    await Assert.That(result.Problems).IsEmpty();
    await Assert.That(result.Users).IsEmpty();
    await Assert.That(result.PreFreezeSnapshot).IsEmpty();
    await Assert.That(result.ResolveEvents).IsEmpty();
  }

  [Test]
  public async Task Convert_ZeroFreezeLength_LeavesNothingPending()
  {
    var doc = await LoadSampleAsync();
    doc.Descendants("scoreboard-freeze-length").Single().Value = "0:00:00";

    var result = IcpcResolverEngine.Convert(doc.ToString());

    await Assert.That(result.ResolveEvents).IsEmpty();
    await Assert.That(result.PreFreezeSnapshot).Count().IsEqualTo(54);
  }

  [Test]
  public async Task Convert_ResolveEventsCarryFullPenaltyAndTimingOutputs()
  {
    var doc = await LoadSampleAsync();
    doc.Descendants("info").Single().Element("penalty")!.Value = "1";
    doc.Root!.Elements("team").Where(team => !new[] { 5, 15 }.Contains((int)team.Element("id")!))
      .Remove();
    doc.Root!.Elements("problem").Where(problem => (int)problem.Element("id")! != 1).Remove();
    doc.Root!.Elements("run")
      .Where(run => !new[] { 3717, 3710, 3714 }.Contains((int)run.Element("id")!)).Remove();
    doc.Descendants("length").Single().Value = "0:05:00";
    doc.Descendants("scoreboard-freeze-length").Single().Value = "0:03:00";

    var result = IcpcResolverEngine.Convert(doc.ToString());

    // Freeze at 120s excludes every surviving run, so both teams resolve.
    await Assert.That(result.ResolveEvents).Count().IsEqualTo(2);

    // Team 15 was lowest before resolution (both teams started at 0).
    // Times are floored by the parser; penalty = floor(178) + 60 for one WA.
    var first = result.ResolveEvents[0];
    await Assert.That(first.UserId).IsEqualTo(15);
    await Assert.That(first.ProblemId).IsEqualTo(1);
    await Assert.That(first.NewTotalScore).IsEqualTo(100);
    await Assert.That(first.NewTotalPenalty).IsEqualTo(238);
    await Assert.That(first.NewRank).IsEqualTo(1);
    await Assert.That(first.NewProblemScore).IsEqualTo(100);
    await Assert.That(first.Verdict).IsEqualTo(VerdictRunResult.Accepted);
    await Assert.That(first.TimeSinceStart).IsEqualTo(178);

    var second = result.ResolveEvents[1];
    await Assert.That(second.UserId).IsEqualTo(5);
    await Assert.That(second.NewTotalScore).IsEqualTo(100);
    await Assert.That(second.NewTotalPenalty).IsEqualTo(186);
    await Assert.That(second.NewRank).IsEqualTo(1);
    await Assert.That(second.NewProblemScore).IsEqualTo(100);
    await Assert.That(second.Verdict).IsEqualTo(VerdictRunResult.Accepted);
    await Assert.That(second.TimeSinceStart).IsEqualTo(186);
  }

  [Test]
  public async Task Convert_TiedTeamsShareRankAndSkipTheNextRank()
  {
    var doc = await LoadSampleAsync();
    doc.Root!.Elements("team")
      .Where(team => !new[] { 5, 15, 42 }.Contains((int)team.Element("id")!)).Remove();
    doc.Root!.Elements("problem").Where(problem => (int)problem.Element("id")! != 1).Remove();
    doc.Root!.Elements("run")
      .Where(run => !new[] { 3717, 3714 }.Contains((int)run.Element("id")!)).Remove();
    // Force team 15's accepted run to exactly match team 5's finish time.
    doc.Descendants("time").Single(t => t.Parent?.Element("id")?.Value == "3714").Value =
      "186.084502";
    doc.Descendants("scoreboard-freeze-length").Single().Value = "0:00:00";

    var result = IcpcResolverEngine.Convert(doc.ToString());

    var entries = result.PreFreezeSnapshot;
    await Assert.That(entries.Single(entry => entry.UserId == 5).Rank).IsEqualTo(1);
    await Assert.That(entries.Single(entry => entry.UserId == 15).Rank).IsEqualTo(1);
    await Assert.That(entries.Single(entry => entry.UserId == 42).Rank).IsEqualTo(3);
  }

  [Test]
  public async Task Convert_ExcludesUsernamesAndTheirRuns()
  {
    var xml = await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "Fixtures",
      "sample.xml"));
    var result = IcpcResolverEngine.Convert(xml, ["CONTEST_1", "CONTEST_5"]);

    await Assert.That(result.Users).Count().IsEqualTo(52);
    await Assert.That(result.PreFreezeSnapshot.Any(entry => entry.UserId is 1 or 5)).IsFalse();
    await Assert.That(result.ResolveEvents.Any(entry => entry.UserId is 1 or 5)).IsFalse();
  }

  [Test]
  public async Task Convert_DropsRunsBeyondTheContestDuration()
  {
    var doc = await LoadSampleAsync();
    doc.Descendants("length").Single().Value = "0:02:00";
    doc.Descendants("scoreboard-freeze-length").Single().Value = "0:00:00";

    var result = IcpcResolverEngine.Convert(doc.ToString());

    await Assert.That(result.DurationSeconds).IsEqualTo(120);
    await Assert.That(result.PreFreezeSnapshot.All(entry =>
        entry.LastSubmittedSeconds is null || entry.LastSubmittedSeconds <= 120))
      .IsTrue();
    await Assert.That(result.ResolveEvents.All(entry => entry.TimeSinceStart <= 120)).IsTrue();
  }

  private static async Task AssertSubmissionCounts(
    IReadOnlyList<FreezeSnapshotEntry> entries)
  {
    var team5Prob1 = entries
      .Single(e => e.UserId == 5)
      .Problems.Single(p => p.ProblemId == 1);
    await Assert.That(team5Prob1.PreFreezeSubmissionCount).IsGreaterThan(0);
    await Assert.That(team5Prob1.PostFreezeSubmissionCount).IsEqualTo(0);

    var team42Prob6 = entries
      .Single(e => e.UserId == 42)
      .Problems.Single(p => p.ProblemId == 6);
    await Assert.That(team42Prob6.PreFreezeSubmissionCount).IsEqualTo(2);
    await Assert.That(team42Prob6.PostFreezeSubmissionCount).IsEqualTo(3);
  }

  private static async Task AssertTeams(
    IReadOnlyList<FreezeSnapshotEntry> actual,
    IReadOnlyList<ExpectedTeam> expected)
  {
    await Assert.That(actual).Count().IsEqualTo(expected.Count);
    foreach (var expectedTeam in expected)
    {
      var userId = UserIdFor(expectedTeam.Username);
      var actualEntry = actual.First(entry => entry.UserId == userId);
      await Assert.That(actualEntry.TotalScore).IsEqualTo(expectedTeam.Score);
      await Assert.That(actualEntry.Rank).IsEqualTo(expectedTeam.Rank);
    }
  }

  private static async Task AssertEvents(
    IReadOnlyList<IcpcResolveEvent> actual,
    IReadOnlyList<ExpectedResolveEvent> expected)
  {
    await Assert.That(actual).Count().IsEqualTo(expected.Count);
    for (var index = 0; index < expected.Count; index++)
    {
      var actualEvent = actual[index];
      var expectedEvent = expected[index];
      await Assert.That(actualEvent.UserId).IsEqualTo(expectedEvent.UserId);
      await Assert.That(actualEvent.ProblemId).IsEqualTo(expectedEvent.ProblemId);
      await Assert.That(actualEvent.NewTotalScore).IsEqualTo(expectedEvent.NewScore);
      await Assert.That(actualEvent.NewRank).IsEqualTo(expectedEvent.NewRank);
      await Assert.That(actualEvent.Verdict).IsEqualTo(expectedEvent.Verdict);
    }
  }

  private static async Task<XDocument> LoadSampleAsync()
  {
    var xml = await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "Fixtures",
      "sample.xml"));
    return XDocument.Parse(xml);
  }

  private static int UserIdFor(string username)
  {
    return int.Parse(username["CONTEST_".Length..], CultureInfo.InvariantCulture);
  }

  private sealed record ExpectedTeam(string Username, double Score, int Rank);

  private sealed record ExpectedResolveEvent(
    int UserId,
    int ProblemId,
    double NewScore,
    int NewRank,
    VerdictRunResult Verdict);
}