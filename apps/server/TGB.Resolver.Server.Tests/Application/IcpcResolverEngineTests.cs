using TGB.Resolver.IcpcXmlParser;
using TGB.Resolver.Server.Features.Show.Data;
using TGB.Resolver.Server.Importing;

namespace TGB.Resolver.Server.Tests.Application;

public sealed class IcpcResolverEngineTests
{
  // Produced by VNOI's buildInitialState(), rankUsers(), and default reveal
  // reducer after translating this real DMOJ XML fixture.
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
    new("CONTEST_42", "F", 0, 53, "Hồi kết", VerdictRunResult.WrongAnswer),
    new("CONTEST_46", "A", 32, 50, "Thế Giới Âm Nhạc", VerdictRunResult.TimeLimitExceeded),
    new("CONTEST_20", "B", 21, 51, "Kỳ thi tranh tài", VerdictRunResult.WrongAnswer),
    new("CONTEST_32", "F", 41, 49, "Hồi kết", VerdictRunResult.WrongAnswer),
    new("CONTEST_17", "F", 100, 47, "Hồi kết", VerdictRunResult.WrongAnswer),
    new("CONTEST_3", "F", 100, 44, "Hồi kết", VerdictRunResult.WrongAnswer),
    new("CONTEST_9", "B", 118.75, 39, "Kỳ thi tranh tài", VerdictRunResult.WrongAnswer),
    new("CONTEST_11", "C", 100, 41, "Ghép cây", VerdictRunResult.TimeLimitExceeded),
    new("CONTEST_23", "B", 118.75, 40, "Kỳ thi tranh tài", VerdictRunResult.TimeLimitExceeded),
    new("CONTEST_23", "F", 118.75, 40, "Hồi kết", VerdictRunResult.WrongAnswer),
    new("CONTEST_9", "D", 118.75, 39, "AND Table", VerdictRunResult.TimeLimitExceeded),
    new("CONTEST_45", "F", 118.75, 38, "Hồi kết", VerdictRunResult.WrongAnswer),
    new("CONTEST_6", "F", 118.75, 37, "Hồi kết", VerdictRunResult.WrongAnswer),
    new("CONTEST_33", "F", 118.75, 36, "Hồi kết", VerdictRunResult.WrongAnswer),
    new("CONTEST_38", "F", 118.75, 35, "Hồi kết", VerdictRunResult.WrongAnswer),
    new("CONTEST_13", "C", 118.75, 33, "Ghép cây", VerdictRunResult.RuntimeError),
    new("CONTEST_30", "C", 126.25, 30, "Ghép cây", VerdictRunResult.RuntimeError),
    new("CONTEST_40", "C", 126.25, 29, "Ghép cây", VerdictRunResult.TimeLimitExceeded),
    new("CONTEST_39", "F", 126.25, 28, "Hồi kết", VerdictRunResult.WrongAnswer),
    new("CONTEST_8", "F", 145, 26, "Hồi kết", VerdictRunResult.WrongAnswer),
    new("CONTEST_18", "C", 145, 25, "Ghép cây", VerdictRunResult.TimeLimitExceeded),
    new("CONTEST_18", "F", 145, 25, "Hồi kết", VerdictRunResult.WrongAnswer),
    new("CONTEST_21", "C", 145, 24, "Ghép cây", VerdictRunResult.TimeLimitExceeded),
    new("CONTEST_26", "B", 156.25, 23, "Kỳ thi tranh tài", VerdictRunResult.WrongAnswer),
    new("CONTEST_26", "C", 216.25, 18, "Ghép cây", VerdictRunResult.TimeLimitExceeded),
    new("CONTEST_12", "F", 175, 22, "Hồi kết", VerdictRunResult.WrongAnswer),
    new("CONTEST_50", "C", 200, 20, "Ghép cây", VerdictRunResult.TimeLimitExceeded),
    new("CONTEST_28", "D", 208.75, 19, "AND Table", VerdictRunResult.WrongAnswer),
    new("CONTEST_26", "F", 216.25, 18, "Hồi kết", VerdictRunResult.WrongAnswer),
    new("CONTEST_14", "F", 216.25, 17, "Hồi kết", VerdictRunResult.WrongAnswer),
    new("CONTEST_53", "D", 255, 11, "AND Table", VerdictRunResult.TimeLimitExceeded),
    new("CONTEST_7", "C", 226.25, 16, "Ghép cây", VerdictRunResult.TimeLimitExceeded),
    new("CONTEST_7", "F", 226.25, 16, "Hồi kết", VerdictRunResult.WrongAnswer),
    new("CONTEST_34", "F", 235, 12, "Hồi kết", VerdictRunResult.WrongAnswer),
    new("CONTEST_44", "D", 350, 6, "AND Table", VerdictRunResult.WrongAnswer),
    new("CONTEST_44", "F", 350, 6, "Hồi kết", VerdictRunResult.WrongAnswer),
    new("CONTEST_27", "D", 437.5, 3, "AND Table", VerdictRunResult.TimeLimitExceeded),
    new("CONTEST_4", "D", 427.5, 5, "AND Table", VerdictRunResult.RuntimeError),
    new("CONTEST_35", "D", 506.25, 2, "AND Table", VerdictRunResult.Accepted)
  ];

  [Test]
  public async Task Convert_MatchesTheVnoiFrozenBoardAndRevealSequence()
  {
    var xml = await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "Fixtures",
      "sample.xml"));
    var result = IcpcResolverEngine.Convert(xml, ["CONTEST_1"]);

    await AssertTeams(result.PreFreezeSnapshot, ExpectedFrozenBoard);
    await AssertEvents(result.ResolveEvents, ExpectedResolveEvents);
  }

  private static async Task AssertTeams(
    IReadOnlyList<ContestTeam> actual,
    IReadOnlyList<ExpectedTeam> expected)
  {
    await Assert.That(actual).Count().IsEqualTo(expected.Count);
    for (var index = 0; index < expected.Count; index++)
    {
      var actualTeam = actual[index];
      var expectedTeam = expected[index];
      await Assert.That(actualTeam.Username).IsEqualTo(expectedTeam.Username);
      await Assert.That(actualTeam.Score).IsEqualTo(expectedTeam.Score);
      await Assert.That(actualTeam.Rank).IsEqualTo(expectedTeam.Rank);
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
      await Assert.That(actualEvent.Username).IsEqualTo(expectedEvent.Username);
      await Assert.That(actualEvent.Problem).IsEqualTo(expectedEvent.Problem);
      await Assert.That(actualEvent.NewTotalScore).IsEqualTo(expectedEvent.NewScore);
      await Assert.That(actualEvent.NewRank).IsEqualTo(expectedEvent.NewRank);
      await Assert.That(actualEvent.ProblemDisplayName).IsEqualTo(expectedEvent.ProblemDisplayName);
      await Assert.That(actualEvent.Verdict).IsEqualTo(expectedEvent.Verdict);
    }
  }

  private sealed record ExpectedTeam(string Username, double Score, int Rank);

  private sealed record ExpectedResolveEvent(
    string Username,
    string Problem,
    double NewScore,
    int NewRank,
    string ProblemDisplayName,
    VerdictRunResult Verdict);
}