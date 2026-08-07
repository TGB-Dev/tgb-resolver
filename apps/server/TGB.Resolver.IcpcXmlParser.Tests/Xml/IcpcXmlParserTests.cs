// ReSharper cannot resolve public record members from this referenced project under .NET 10.
// The compiler and TUnit execute this file as part of the parser test project.
// ReSharper disable CannotResolveSymbol

using System.Xml.Linq;
using IcpcParser = TGB.Resolver.IcpcXmlParser.IcpcXmlParser;

namespace TGB.Resolver.IcpcXmlParser.Tests.Xml;

public sealed class IcpcXmlParserTests
{
  [Test]
  public async Task ParseFile_ReadsContestInfoAndCollections()
  {
    var result = IcpcParser.ParseFile(ResolveSamplePath());

    await Assert.That(result.Info.ContestId).IsEqualTo("contest");
    await Assert.That(result.Info.Title).IsEqualTo("Contest");
    await Assert.That(result.Info.StartTime).IsEqualTo(1723862700);
    await Assert.That(result.Info.Length).IsEqualTo("3:05:00");
    await Assert.That(result.Info.Penalty).IsEqualTo(5);
    await Assert.That(result.Info.ScoreboardFreezeLength).IsEqualTo("0:15:00");
    await Assert.That(result.Problem.Count).IsEqualTo(6);
    await Assert.That(result.Problem[1].Score).IsEqualTo(125d);
    await Assert.That(result.Problem[0].Label).IsEqualTo("A");
    await Assert.That(result.Problem[0].Name).IsEqualTo("Thế Giới Âm Nhạc");
    await Assert.That(result.Team.Count).IsEqualTo(54);
    await Assert.That(result.Run.Count).IsEqualTo(809);
    await Assert.That((int)result.Run[0].Time).IsEqualTo(86);
    await Assert.That(result.Run[0].SubmissionSecondsSinceStart).IsEqualTo(86.632682);
    await Assert.That(result.Run[0].Penalized).IsTrue();
    await Assert.That(result.Run[0].Verdict).IsEqualTo(VerdictRunResult.WrongAnswer);
    await Assert.That(result.Run.Any(run => Math.Abs(run.Score - 23d) < 1e-9)).IsTrue();
  }

  [Test]
  public async Task Parse_RejectsInvalidContestRoot()
  {
    await Assert.That(() => IcpcParser.Parse("<root></root>"))
      .Throws<InvalidOperationException>()
      .WithMessageContaining("missing or invalid <contest>");
  }

  [Test]
  public async Task Parse_RejectsInvalidXml()
  {
    await Assert.That(() => IcpcParser.Parse("not xml"))
      .Throws<InvalidOperationException>()
      .WithMessageContaining("Failed to parse XML");
  }

  [Test]
  public async Task Parse_MissingRequiredElement_Throws()
  {
    var doc = await LoadSampleAsync();
    doc.Descendants("info").Single().Element("title")!.Remove();

    await Assert.That(() => IcpcParser.Parse(doc.ToString()))
      .Throws<InvalidOperationException>()
      .WithMessageContaining("Missing <title>");
  }

  [Test]
  public async Task Parse_InvalidNumericValue_Throws()
  {
    var doc = await LoadSampleAsync();
    doc.Descendants("starttime").Single().Value = "not-a-number";

    await Assert.That(() => IcpcParser.Parse(doc.ToString()))
      .Throws<InvalidOperationException>()
      .WithMessageContaining("Invalid numeric value for <starttime>");
  }

  [Test]
  public async Task Parse_AbsentProblemScore_DefaultsTo100()
  {
    var doc = await LoadSampleAsync();
    doc.Root!.Elements("problem").Single(p => (int)p.Element("id")! == 1).Element("score")!
      .Remove();

    var result = IcpcParser.Parse(doc.ToString());

    await Assert.That(result.Problem[0].Score).IsEqualTo(100);
    await Assert.That(result.Problem[1].Score).IsEqualTo(125);
  }

  [Test]
  public async Task Parse_TrimsWhitespaceAroundNames()
  {
    var doc = await LoadSampleAsync();
    doc.Root!.Elements("problem").Single(p => (int)p.Element("id")! == 1).Element("name")!
      .Value = "   padded name   ";

    var result = IcpcParser.Parse(doc.ToString());

    await Assert.That(result.Problem[0].Name).IsEqualTo("padded name");
  }

  [Test]
  public async Task Parse_MapsEveryVerdictAcronym()
  {
    var expected = new Dictionary<string, VerdictRunResult>
    {
      ["AC"] = VerdictRunResult.Accepted,
      ["WA"] = VerdictRunResult.WrongAnswer,
      ["TLE"] = VerdictRunResult.TimeLimitExceeded,
      ["MLE"] = VerdictRunResult.MemoryLimitExceeded,
      ["OLE"] = VerdictRunResult.OutputLimitExceeded,
      ["IR"] = VerdictRunResult.InvalidReturn,
      ["RTE"] = VerdictRunResult.RuntimeError,
      ["CE"] = VerdictRunResult.CompileError,
      ["IE"] = VerdictRunResult.InternalError,
      ["SC"] = VerdictRunResult.ShortCircuited,
      ["AB"] = VerdictRunResult.Aborted
    };

    foreach (var (acronym, verdict) in expected)
    {
      var doc = await LoadSampleAsync();
      doc.Descendants("run").First().Element("result")!.Value = acronym;

      var result = IcpcParser.Parse(doc.ToString());

      await Assert.That(result.Run[0].Verdict).IsEqualTo(verdict);
    }
  }

  [Test]
  public async Task Parse_UnknownVerdictAcronym_MapsToUnknown()
  {
    var doc = await LoadSampleAsync();
    doc.Descendants("run").First().Element("result")!.Value = "??";

    var result = IcpcParser.Parse(doc.ToString());

    await Assert.That(result.Run[0].Verdict).IsEqualTo(VerdictRunResult.Unknown);
  }

  [Test]
  public async Task Parse_ToleratesIgnoredBlocks()
  {
    var doc = await LoadSampleAsync();
    doc.Root!.Add(new XElement("mystery", new XElement("data", "1")));

    var result = IcpcParser.Parse(doc.ToString());

    // The real fixture carries <language>, <region>, <judgement>, <finalized>,
    // team metadata, and run <timestamp>/<judged> elements that the parser
    // must ignore; only contest/problem/team/run are surfaced.
    await Assert.That(result.Team.Count).IsEqualTo(54);
    await Assert.That(result.Problem.Count).IsEqualTo(6);
    await Assert.That(result.Run.Count).IsEqualTo(809);
    await Assert.That(result.Info.ContestId).IsEqualTo("contest");
    await Assert.That(result.Info.Penalty).IsEqualTo(5);
  }

  [Test]
  public async Task Parse_RunIdsNotMonotonicInTime_Throws()
  {
    var doc = await LoadSampleAsync();
    // Swap ids of the first two runs (both team 1, problem 6) so the second
    // is later in time yet has the smaller id.
    var first = doc.Descendants("run").ElementAt(0);
    var second = doc.Descendants("run").ElementAt(1);
    (first.Element("id")!.Value, second.Element("id")!.Value) =
      (second.Element("id")!.Value, first.Element("id")!.Value);

    await Assert.That(() => IcpcParser.Parse(doc.ToString()))
      .Throws<InvalidOperationException>()
      .WithMessageContaining("monotonic in time");
  }

  [Test]
  public async Task Parse_EqualTimeRunsWithDescendingIds_Throws()
  {
    var doc = await LoadSampleAsync();
    // Both runs at the same floored second, ids descending.
    var first = doc.Descendants("run").ElementAt(0);
    var second = doc.Descendants("run").ElementAt(1);
    second.Element("time")!.Value = first.Element("time")!.Value;
    (first.Element("id")!.Value, second.Element("id")!.Value) =
      (second.Element("id")!.Value, first.Element("id")!.Value);

    await Assert.That(() => IcpcParser.Parse(doc.ToString()))
      .Throws<InvalidOperationException>()
      .WithMessageContaining("monotonic in time");
  }

  private static async Task<XDocument> LoadSampleAsync()
  {
    var xml = await File.ReadAllTextAsync(ResolveSamplePath());
    return XDocument.Parse(xml);
  }

  private static string ResolveSamplePath()
  {
    return Path.Combine(AppContext.BaseDirectory, "Fixtures", "sample.xml");
  }
}
// ReSharper restore CSharpErrors