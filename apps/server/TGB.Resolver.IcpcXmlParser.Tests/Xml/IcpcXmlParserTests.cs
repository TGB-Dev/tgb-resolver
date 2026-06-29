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
    await Assert.That(result.Info.ScoreboardFreezeLength).IsEqualTo("0:15:00");
    await Assert.That(result.Language.Count).IsEqualTo(20);
    await Assert.That(result.Region.Count).IsEqualTo(1);
    await Assert.That(result.Judgement.Count).IsEqualTo(11);
    await Assert.That(result.Problem.Count).IsEqualTo(6);
    await Assert.That(result.Team.Count).IsEqualTo(54);
    await Assert.That(result.Run.Count).IsEqualTo(809);
    await Assert.That(result.Finalized).IsNotNull();
  }

  [Test]
  public async Task Parse_RejectsInvalidContestRoot()
  {
    InvalidOperationException? invalidContestRootException = null;
    InvalidOperationException? invalidXmlException = null;

    try
    {
      IcpcParser.Parse("<root></root>");
    }
    catch (InvalidOperationException ex)
    {
      invalidContestRootException = ex;
    }

    try
    {
      IcpcParser.Parse("not xml");
    }
    catch (InvalidOperationException ex)
    {
      invalidXmlException = ex;
    }

    await Assert.That(invalidContestRootException).IsNotNull();
    await Assert.That(invalidXmlException).IsNotNull();
  }

  private static string ResolveSamplePath()
  {
    return Path.Combine(AppContext.BaseDirectory, "Fixtures", "sample.xml");
  }
}
