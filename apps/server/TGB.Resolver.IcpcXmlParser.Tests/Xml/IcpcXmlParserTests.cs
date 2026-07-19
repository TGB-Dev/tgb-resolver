// ReSharper cannot resolve public record members from this referenced project under .NET 10.
// The compiler and TUnit execute this file as part of the parser test project.
// ReSharper disable CannotResolveSymbol

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
// ReSharper restore CSharpErrors