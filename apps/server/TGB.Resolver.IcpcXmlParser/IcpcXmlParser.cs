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
      throw new InvalidOperationException(
        "Failed to parse XML: missing or invalid <contest> root element.");

    return new IcpcXmlContest(
      ParseInfo(info),
      [.. contest.Elements("problem").Select(ParseProblem)],
      [.. contest.Elements("team").Select(ParseTeam)],
      [.. contest.Elements("run").Select(ParseRun)]);
  }

  private static IcpcXmlInfo ParseInfo(XElement element)
  {
    return new IcpcXmlInfo(
      GetString(element, "contest-id"),
      GetString(element, "title"),
      (int)Math.Truncate(GetDouble(element, "starttime")),
      GetString(element, "length"),
      (int)Math.Truncate(GetDouble(element, "penalty")),
      GetString(element, "scoreboard-freeze-length"));
  }

  private static IcpcXmlProblem ParseProblem(XElement element)
  {
    return new IcpcXmlProblem(
      (int)Math.Truncate(GetDouble(element, "id")),
      GetString(element, "label"),
      GetDouble(element, "score", 100));
  }

  private static IcpcXmlTeam ParseTeam(XElement element)
  {
    return new IcpcXmlTeam(
      (int)Math.Truncate(GetDouble(element, "id")),
      GetString(element, "name"),
      GetString(element, "username"));
  }

  private static IcpcXmlRun ParseRun(XElement element)
  {
    return new IcpcXmlRun(
      (int)Math.Truncate(GetDouble(element, "id")),
      (int)Math.Truncate(GetDouble(element, "problem")),
      (int)Math.Truncate(GetDouble(element, "team")),
      Math.Floor(GetDouble(element, "time")),
      GetString(element, "solved"),
      GetString(element, "penalty"),
      GetDouble(element, "score", 0));
  }

  private static string GetString(XElement element, string name)
  {
    return element.Element(name)?.Value.Trim()
           ?? throw new InvalidOperationException($"Missing <{name}> element.");
  }

  private static double GetDouble(XElement element, string name, double? defaultValue = null)
  {
    var value = element.Element(name)?.Value.Trim();
    if (value is null && defaultValue.HasValue) return defaultValue.Value;
    if (value is null) throw new InvalidOperationException($"Missing <{name}> element.");

    if (!double.TryParse(value, CultureInfo.InvariantCulture, out var parsed))
      throw new InvalidOperationException($"Invalid numeric value for <{name}>: {value}");

    return parsed;
  }
}

public sealed record IcpcXmlContest(
  IcpcXmlInfo Info,
  IReadOnlyList<IcpcXmlProblem> Problem,
  IReadOnlyList<IcpcXmlTeam> Team,
  IReadOnlyList<IcpcXmlRun> Run);

public sealed record IcpcXmlInfo(
  string ContestId,
  string Title,
  // Parsed for consumers that need the contest's original start timestamp.
  // ReSharper disable once NotAccessedPositionalProperty.Global
  int StartTime,
  string Length,
  // ReSharper disable once NotAccessedPositionalProperty.Global
  int Penalty,
  string ScoreboardFreezeLength);

public sealed record IcpcXmlProblem(int Id, string Label, double Score);

public sealed record IcpcXmlTeam(
  int Id,
  string Name,
  string Username);

public sealed record IcpcXmlRun(
  int Id,
  int Problem,
  int Team,
  double Time,
  string Solved,
  // ReSharper disable once NotAccessedPositionalProperty.Global
  string Penalty,
  double Score);