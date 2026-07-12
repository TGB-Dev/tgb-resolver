using Microsoft.EntityFrameworkCore;
using NodaTime;
using TGB.Resolver.IcpcXmlParser;
using TGB.Resolver.Server.Commons.Data;
using TGB.Resolver.Server.Commons.Exceptions;
using TGB.Resolver.Server.Commons.Serialization;
using TGB.Resolver.Server.Commons.Types;
using TGB.Resolver.Server.Importing;

namespace TGB.Resolver.Server.Features.Show.Data;

public sealed class ShowRawRepository(
  ResolverDbContext dbContext,
  AppJsonSerializer serializer,
  IClock clock)
{
  private const string LocalShowId = "local-show";
  private const int CurrentSchemaVersion = 1;

  public async Task EnsureSeededAsync(CancellationToken cancellationToken = default)
  {
    if (await dbContext.ShowStates.AnyAsync(cancellationToken)) return;

    var seeded = CreateSeededShow();
    var entity = new StoredShowState
    {
      Id = LocalShowId,
      ShowVersion = seeded.ShowVersion,
      PayloadJson = serializer.Serialize(seeded),
      UpdatedAtUnixMs = clock.GetCurrentInstant().ToUnixTimeMilliseconds()
    };

    dbContext.ShowStates.Add(entity);
    await dbContext.SaveChangesAsync(cancellationToken);
  }

  public async Task<ShowState> GetStateAsync(CancellationToken cancellationToken = default)
  {
    var entity = await GetEntityAsync(cancellationToken);
    return serializer.Deserialize<ShowState>(entity.PayloadJson);
  }

  public async Task<ShowState> MutateAsync(
    int expectedShowVersion,
    Func<ShowState, ShowState> mutation,
    CancellationToken cancellationToken = default)
  {
    var entity = await GetEntityAsync(cancellationToken);
    var current = serializer.Deserialize<ShowState>(entity.PayloadJson);

    if (current.ShowVersion != expectedShowVersion)
      throw new VersionDriftException(expectedShowVersion, current.ShowVersion);

    var updated = mutation(current);
    entity.ShowVersion = updated.ShowVersion;
    entity.PayloadJson = serializer.Serialize(updated);
    entity.UpdatedAtUnixMs = clock.GetCurrentInstant().ToUnixTimeMilliseconds();

    await dbContext.SaveChangesAsync(cancellationToken);
    return updated;
  }

  public async Task<ShowState> MutateWithoutVersionAsync(
    Func<ShowState, ShowState> mutation,
    CancellationToken cancellationToken = default)
  {
    var entity = await GetEntityAsync(cancellationToken);
    var current = serializer.Deserialize<ShowState>(entity.PayloadJson);
    var updated = mutation(current);

    entity.ShowVersion = updated.ShowVersion;
    entity.PayloadJson = serializer.Serialize(updated);
    entity.UpdatedAtUnixMs = clock.GetCurrentInstant().ToUnixTimeMilliseconds();

    await dbContext.SaveChangesAsync(cancellationToken);
    return updated;
  }

  public async Task<ShowState> ReplaceAsync(
    ShowState nextState,
    CancellationToken cancellationToken = default)
  {
    var entity = await GetEntityAsync(cancellationToken);
    entity.ShowVersion = nextState.ShowVersion;
    entity.PayloadJson = serializer.Serialize(nextState);
    entity.UpdatedAtUnixMs = clock.GetCurrentInstant().ToUnixTimeMilliseconds();
    await dbContext.SaveChangesAsync(cancellationToken);
    return nextState;
  }

  private async Task<StoredShowState> GetEntityAsync(CancellationToken cancellationToken)
  {
    await EnsureSeededAsync(cancellationToken);
    var entity = await dbContext.ShowStates.SingleAsync(
      row => row.Id == LocalShowId, cancellationToken);
    return entity;
  }

  public static ShowState BuildShowFromXml(string xml, IReadOnlyList<string>? excludedUsernames,
    int showVersion)
  {
    var resolution = IcpcResolverEngine.Convert(xml, excludedUsernames);
    var runs = resolution.ResolveEvents
      .Select((resolve, index) => new TimelineEvent(
        index + 1, index + 1, TimelineEventType.Res, 0, false, null,
        new ResolveEventPayload(
          resolve.RealName, resolve.Username, resolve.Problem,
          resolve.NewTotalScore, resolve.NewRank, resolve.NewProblemScore,
          resolve.ProblemDisplayName, resolve.Verdict),
        null, null))
      .ToArray();

    return CreateEmptyShow(showVersion, ShowSource.Xml) with
    {
      Meta = new ShowMeta(resolution.Title, resolution.ContestId, ShowSource.Xml),
      Contest = new ContestState(
        resolution.DurationSeconds,
        resolution.FreezeDurationSeconds,
        resolution.PreFreezeSnapshot),
      Timeline = runs
    };
  }

  private static ShowState CreateSeededShow()
  {
    return CreateEmptyShow(1, ShowSource.Manual) with
    {
      Meta = new ShowMeta("Local Show", "local-show", ShowSource.Manual),
      Contest = new ContestState(18_000, 3_600,
      [
        new ContestTeam(1, "Alice Team", "alice", 100, 1),
        new ContestTeam(2, "Bob Team", "bob", 80, 2)
      ]),
      Timeline =
      [
        new TimelineEvent(1, 1, TimelineEventType.Res, 0, false, null,
          new ResolveEventPayload("Alice Team", "alice", "A", 100, 1, 0, "",
            VerdictRunResult.Accepted), null, null),
        new TimelineEvent(2, 2, TimelineEventType.Sfx, 0.5, false, "Opening Sting",
          null, null, new MediaEventPayload("sting", 2.5)),
        new TimelineEvent(3, 3, TimelineEventType.Img, 1, false, "Title Board",
          null, new MediaEventPayload("award-board", 5), null),
        new TimelineEvent(4, 4, TimelineEventType.Res, 0, false, "Bob Reveal",
          new ResolveEventPayload("Bob Team", "bob", "B", 180, 2, 0, "", VerdictRunResult.Accepted),
          null, null)
      ]
    };
  }

  public static ShowState CreateEmptyShow(int showVersion, ShowSource source)
  {
    return new ShowState(
      CurrentSchemaVersion,
      showVersion,
      ShowMode.Editing,
      TimelineMode.Rw,
      new ShowMeta("Untitled show", null, source),
      new ContestState(0, 0, []),
      new AutomationState(false, 3_000, false),
      new PlaybackState(PlaybackStatus.Idle, null, null, null, null, 0),
      new AssetCollection([], []),
      []);
  }
}