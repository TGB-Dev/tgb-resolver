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
    return DeserializeShow(entity.PayloadJson);
  }

  public async Task<ShowState> MutateAsync(
    int expectedShowVersion,
    Func<ShowState, ShowState> mutation,
    CancellationToken cancellationToken = default)
  {
    var entity = await GetEntityAsync(cancellationToken);
    var current = DeserializeShow(entity.PayloadJson);

    if (current.ShowVersion != expectedShowVersion)
      throw new VersionDriftException(expectedShowVersion, current.ShowVersion);

    var updated = mutation(current);
    entity.ShowVersion = updated.ShowVersion;
    entity.PayloadJson = serializer.Serialize(updated);
    entity.UpdatedAtUnixMs = clock.GetCurrentInstant().ToUnixTimeMilliseconds();

    await dbContext.SaveChangesAsync(cancellationToken);
    return updated;
  }

  /// <summary>
  ///   Applies a control-state mutation (playback, live mode, automation,
  ///   timeline mode, assets) WITHOUT changing the data show version. Only
  ///   timeline content edits may bump the version, so the audience/editor
  ///   cache stays coherent across playback changes.
  /// </summary>
  public async Task<ShowState> MutateControlStateAsync(
    Func<ShowState, ShowState> mutation,
    CancellationToken cancellationToken = default)
  {
    var entity = await GetEntityAsync(cancellationToken);
    var current = DeserializeShow(entity.PayloadJson);
    var updated = mutation(current);

    entity.PayloadJson = serializer.Serialize(updated with { ShowVersion = current.ShowVersion });
    entity.UpdatedAtUnixMs = clock.GetCurrentInstant().ToUnixTimeMilliseconds();

    await dbContext.SaveChangesAsync(cancellationToken);
    return updated;
  }

  public async Task<ShowState> MutateControlStateAsync(
    int expectedShowVersion,
    Func<ShowState, ShowState> mutation,
    CancellationToken cancellationToken = default)
  {
    var entity = await GetEntityAsync(cancellationToken);
    var current = DeserializeShow(entity.PayloadJson);
    if (current.ShowVersion != expectedShowVersion)
      throw new VersionDriftException(expectedShowVersion, current.ShowVersion);

    var updated = mutation(current);

    entity.PayloadJson = serializer.Serialize(updated with { ShowVersion = current.ShowVersion });
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

  private ShowState DeserializeShow(string json)
  {
    return ShowStateNormalizer.Normalize(serializer.Deserialize<ShowState>(json));
  }

  public static ShowState BuildShowFromXml(string xml, IReadOnlyList<string>? excludedUsernames,
    int showVersion)
  {
    var resolution = IcpcResolverEngine.Convert(xml, excludedUsernames);
    var events = new List<TimelineEvent>(resolution.ResolveEvents.Count * 2);
    var id = 1;
    foreach (var resolve in resolution.ResolveEvents)
    {
      var payload = new ResolveEventPayload(
        resolve.UserId, resolve.ProblemId,
        resolve.NewTotalScore, resolve.NewTotalPenalty, resolve.NewRank, resolve.NewProblemScore,
        resolve.Verdict, resolve.TimeSinceStart);

      // Pre-resolve cue immediately precedes its resolve event so the
      // frontend can focus on the upcoming resolution.
      events.Add(new TimelineEvent(id, id, TimelineEventType.Pre, null, false, null, null, null,
        null, payload, null));
      id++;
      events.Add(new TimelineEvent(id, id, TimelineEventType.Res, null, false, null, payload, null,
        null, null, null));
      id++;
    }

    return CreateEmptyShow(showVersion, ShowSource.Xml) with
    {
      Meta = new ShowMeta(resolution.Title, resolution.ContestId, ShowSource.Xml),
      Contest = new ContestState(
        resolution.DurationSeconds,
        resolution.FreezeDurationSeconds,
        resolution.Problems,
        resolution.Users,
        resolution.PreFreezeSnapshot),
      Timeline = events
    };
  }

  private static ShowState CreateSeededShow()
  {
    return CreateEmptyShow(1, ShowSource.Manual) with
    {
      Meta = new ShowMeta("Local Show", "local-show", ShowSource.Manual),
      Contest = new ContestState(18_000, 3_600,
        [
          new ProblemDefinition(1, "A", "Problem A", 100),
          new ProblemDefinition(2, "B", "Problem B", 125)
        ],
        [
          new UserDefinition(1, "alice", "Alice Team"),
          new UserDefinition(2, "bob", "Bob Team")
        ],
        [
          new FreezeSnapshotEntry(1, 100, 0, 1,
          [
            new ProblemFreezeResult(1, 100, VerdictRunResult.Accepted),
            new ProblemFreezeResult(2, 0, VerdictRunResult.Unknown)
          ], 3831, 1390.506239),
          new FreezeSnapshotEntry(2, 80, 0, 2,
          [
            new ProblemFreezeResult(1, 80, VerdictRunResult.Accepted),
            new ProblemFreezeResult(2, 0, VerdictRunResult.Unknown)
          ], 3940, 2985.246934)
        ]),
      Timeline =
      [
        new TimelineEvent(1, 1, TimelineEventType.Res, null, false, null,
          new ResolveEventPayload(1, 1, 100, 0, 1, 0, VerdictRunResult.Accepted, 1094.180335), null,
          null, null, null),
        new TimelineEvent(2, 2, TimelineEventType.Sfx, 0.5, false, "Opening Sting",
          null, null, new MediaEventPayload("sting", 2.5), null, null),
        new TimelineEvent(3, 3, TimelineEventType.Img, 1, false, "Title Board",
          null, new MediaEventPayload("award-board", 5), null, null, null),
        new TimelineEvent(4, 4, TimelineEventType.Res, null, false, "Bob Reveal",
          new ResolveEventPayload(2, 2, 180, 0, 2, 0, VerdictRunResult.Accepted, 1932.430581),
          null, null, null, null)
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
      new ContestState(0, 0, [], [], []),
      new AutomationState(false, 3_000, false),
      new PlaybackState(PlaybackStatus.Idle, null, [], null),
      new AssetCollection([]),
      []);
  }
}