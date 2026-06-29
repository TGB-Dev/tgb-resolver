using System.Globalization;
using System.Xml;
using System.Xml.Linq;

namespace TGB.Resolver.IcpcXmlParser;

public static class IcpcXmlParser
{
  public static IcpcXmlContest ParseFile(string path)
  {
    return Parse(File.ReadAllText(path));
  }

  public static IcpcXmlContest Parse(string xml)
  {
    XDocument document;

    try
    {
      document = XDocument.Parse(xml);
    }
    catch (Exception exception) when (exception is XmlException or ArgumentException)
    {
      throw new InvalidOperationException("Failed to parse XML.", exception);
    }

    var contest = document.Root;
    var info = contest?.Element("info");

    if (contest?.Name.LocalName != "contest" || info is null)
    {
      throw new InvalidOperationException("Failed to parse XML: missing or invalid <contest> root element.");
    }

    return new IcpcXmlContest(
        ParseInfo(info),
        [.. contest.Elements("language").Select(ParseLanguage)],
        [.. contest.Elements("region").Select(ParseRegion)],
        [.. contest.Elements("judgement").Select(ParseJudgement)],
        [.. contest.Elements("problem").Select(ParseProblem)],
        [.. contest.Elements("team").Select(ParseTeam)],
        [.. contest.Elements("run").Select(ParseRun)],
        contest.Element("finalized") is { } finalized ? ParseFinalized(finalized) : null);
  }

  private static IcpcXmlInfo ParseInfo(XElement element)
  {
    return new IcpcXmlInfo(
        GetString(element, "contest-id"),
        GetString(element, "title"),
        (int)Math.Truncate(GetDouble(element, "starttime")),
        GetString(element, "length"),
        (int)Math.Truncate(GetDouble(element, "penalty")),
        GetString(element, "started"),
        GetString(element, "scoreboard-freeze-length"));
  }

  private static IcpcXmlLanguage ParseLanguage(XElement element)
  {
    return new IcpcXmlLanguage(
        (int)Math.Truncate(GetDouble(element, "id")),
        GetString(element, "key"),
        GetString(element, "name"));
  }

  private static IcpcXmlRegion ParseRegion(XElement element)
  {
    return new IcpcXmlRegion(
        (int)Math.Truncate(GetDouble(element, "external-id")),
        GetString(element, "name"));
  }

  private static IcpcXmlJudgement ParseJudgement(XElement element)
  {
    return new IcpcXmlJudgement(GetString(element, "acronym"), GetString(element, "name"));
  }

  private static IcpcXmlProblem ParseProblem(XElement element)
  {
    return new IcpcXmlProblem(
        (int)Math.Truncate(GetDouble(element, "id")),
        GetString(element, "label"),
        GetString(element, "name"),
        GetDouble(element, "score"));
  }

  private static IcpcXmlTeam ParseTeam(XElement element)
  {
    return new IcpcXmlTeam(
        (int)Math.Truncate(GetDouble(element, "id")),
        (int)Math.Truncate(GetDouble(element, "external-id")),
        GetString(element, "name"),
        GetString(element, "username"),
        GetString(element, "nationality"),
        GetString(element, "region"),
        GetString(element, "university"));
  }

  private static IcpcXmlRun ParseRun(XElement element)
  {
    return new IcpcXmlRun(
        (int)Math.Truncate(GetDouble(element, "id")),
        (int)Math.Truncate(GetDouble(element, "problem")),
        GetString(element, "language"),
        (int)Math.Truncate(GetDouble(element, "team")),
        GetDouble(element, "timestamp"),
        GetDouble(element, "time"),
        GetString(element, "judged"),
        GetString(element, "result"),
        GetString(element, "solved"),
        GetDouble(element, "score"),
        GetString(element, "penalty"));
  }

  private static IcpcXmlFinalized ParseFinalized(XElement element)
  {
    return new IcpcXmlFinalized(
        (int)Math.Truncate(GetDouble(element, "last-gold")),
        (int)Math.Truncate(GetDouble(element, "last-silver")),
        (int)Math.Truncate(GetDouble(element, "last-bronze")),
        GetString(element, "comment"),
        GetDouble(element, "timestamp"));
  }

  private static string GetString(XElement element, string name)
  {
    return element.Element(name)?.Value.Trim()
        ?? throw new InvalidOperationException($"Missing <{name}> element.");
  }

  private static double GetDouble(XElement element, string name)
  {
    var value = GetString(element, name);

    if (!double.TryParse(value, CultureInfo.InvariantCulture, out var parsed))
    {
      throw new InvalidOperationException($"Invalid numeric value for <{name}>: {value}");
    }

    return parsed;
  }
}

public sealed record IcpcXmlContest(
    IcpcXmlInfo Info,
    IReadOnlyList<IcpcXmlLanguage> Language,
    IReadOnlyList<IcpcXmlRegion> Region,
    IReadOnlyList<IcpcXmlJudgement> Judgement,
    IReadOnlyList<IcpcXmlProblem> Problem,
    IReadOnlyList<IcpcXmlTeam> Team,
    IReadOnlyList<IcpcXmlRun> Run,
    IcpcXmlFinalized? Finalized);

public sealed record IcpcXmlInfo(
    string ContestId,
    string Title,
    int StartTime,
    string Length,
    int Penalty,
    string Started,
    string ScoreboardFreezeLength);

public sealed record IcpcXmlLanguage(int Id, string Key, string Name);

public sealed record IcpcXmlRegion(int ExternalId, string Name);

public sealed record IcpcXmlJudgement(string Acronym, string Name);

public sealed record IcpcXmlProblem(int Id, string Label, string Name, double Score);

public sealed record IcpcXmlTeam(
    int Id,
    int ExternalId,
    string Name,
    string Username,
    string Nationality,
    string Region,
    string University);

public sealed record IcpcXmlRun(
    int Id,
    int Problem,
    string Language,
    int Team,
    double Timestamp,
    double Time,
    string Judged,
    string Result,
    string Solved,
    double Score,
    string Penalty);

public sealed record IcpcXmlFinalized(
    int LastGold,
    int LastSilver,
    int LastBronze,
    string Comment,
    double Timestamp);
