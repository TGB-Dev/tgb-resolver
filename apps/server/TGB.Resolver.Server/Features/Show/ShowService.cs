using System.Text;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TGB.Resolver.Server.Commons.Data;
using TGB.Resolver.Server.Commons.Serialization;
using TGB.Resolver.Server.Commons.Types;
using TGB.Resolver.Server.Features.Realtime;
using TGB.Resolver.Server.Features.Show.Data;
using TGB.Resolver.Server.Features.Show.Dto;
using TGB.Resolver.Server.Importing;

namespace TGB.Resolver.Server.Features.Show;

public sealed class ShowStateService(
  ResolverDbContext dbContext,
  AppJsonSerializer serializer,
  IHubContext<ShowHub, IShowHubClient> hubContext,
  TimeProvider timeProvider)
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
      UpdatedAtUtc = timeProvider.GetUtcNow()
    };

    dbContext.ShowStates.Add(entity);
    await dbContext.SaveChangesAsync(cancellationToken);
  }

  public async Task<ShowStateSnapshot> GetSnapshotAsync(
    CancellationToken cancellationToken = default)
  {
    var state = await LoadStateAsync(cancellationToken);
    return ShowContractMapper.ToContract(state);
  }

  public async Task<ShowStateSnapshot> OptimizeAsync(VersionedCommandRequest request,
    CancellationToken cancellationToken = default)
  {
    return await MutateAsync(
      request.ShowVersion,
      ShowRefetchReason.Optimized,
      state =>
      {
        var normalized = state.Timeline
          .Where(eventItem => eventItem.Type == TimelineEventType.Res ||
                              eventItem.Image is not null || eventItem.Sfx is not null)
          .Select((eventItem, index) => eventItem with { Position = index + 1 })
          .ToArray();

        return state with
        {
          ShowVersion = state.ShowVersion + 1,
          Timeline = normalized
        };
      },
      cancellationToken);
  }

  public async Task<ShowStateSnapshot> ClearAsync(VersionedCommandRequest request,
    CancellationToken cancellationToken = default)
  {
    return await MutateAsync(
      request.ShowVersion,
      ShowRefetchReason.ShowReplaced,
      state => CreateEmptyShow(state.ShowVersion + 1, ShowSource.Manual),
      cancellationToken);
  }

  public async Task<ShowStateSnapshot> ImportXmlAsync(ImportXmlRequest request,
    CancellationToken cancellationToken = default)
  {
    var current = await LoadStateAsync(cancellationToken);
    EnsureTimelineWritable(current);
    var next = BuildShowFromXml(request.Xml, request.ExcludedUsernames, current.ShowVersion + 1);
    return await ReplaceAsync(next, ShowRefetchReason.ShowReplaced, cancellationToken);
  }

  public async Task<ShowStateSnapshot> ImportBundleAsync(ImportBundleRequest request,
    CancellationToken cancellationToken = default)
  {
    var json = Encoding.UTF8.GetString(Convert.FromBase64String(request.Bytes));
    var imported = serializer.Deserialize<ShowState>(json) with
    {
      ShowVersion = (await LoadStateAsync(cancellationToken)).ShowVersion + 1,
      Meta = serializer.Deserialize<ShowState>(json).Meta with { Source = ShowSource.Bundle }
    };

    return await ReplaceAsync(imported, ShowRefetchReason.ShowReplaced, cancellationToken);
  }

  public async Task<byte[]> ExportBundleAsync(CancellationToken cancellationToken = default)
  {
    var state = await LoadStateAsync(cancellationToken);
    return Encoding.UTF8.GetBytes(serializer.Serialize(state));
  }

  public async Task<ShowStateSnapshot> RenameResolveEventAsync(
    int eventId,
    ResolveEventRenameRequest request,
    CancellationToken cancellationToken = default)
  {
    return await MutateAsync(
      request.ShowVersion,
      ShowRefetchReason.Optimized,
      state =>
      {
        EnsureTimelineWritable(state);
        var updatedTimeline = state.Timeline
          .Select(eventItem => eventItem.Id == eventId && eventItem.Type == TimelineEventType.Res
            ? eventItem with { CustomName = request.CustomName }
            : eventItem)
          .ToArray();

        return state with
        {
          ShowVersion = state.ShowVersion + 1,
          Timeline = updatedTimeline
        };
      },
      cancellationToken);
  }

  public async Task<ShowStateSnapshot> PatchNonResolveEventAsync(
    int eventId,
    NonResolveEventPatchRequest request,
    CancellationToken cancellationToken = default)
  {
    return await MutateAsync(
      request.ShowVersion,
      ShowRefetchReason.Optimized,
      state =>
      {
        EnsureTimelineWritable(state);
        var updatedTimeline = state.Timeline.Select(eventItem =>
        {
          if (eventItem.Id != eventId || eventItem.Type == TimelineEventType.Res) return eventItem;

          return request.Type switch
          {
            TimelineEventType.Img => eventItem with
            {
              Type = TimelineEventType.Img,
              TriggerOffsetSeconds = request.TriggerOffsetSeconds ?? eventItem.TriggerOffsetSeconds,
              RequireManualInteraction = request.RequireManualInteraction ??
                                         eventItem.RequireManualInteraction,
              CustomName = request.CustomName ?? eventItem.CustomName,
              Image = new MediaEventPayload(
                request.Payload?.ImageId ?? eventItem.Image?.AssetId ?? string.Empty,
                request.Payload?.DurationSeconds ?? eventItem.Image?.DurationSeconds),
              Sfx = null
            },
            TimelineEventType.Sfx => eventItem with
            {
              Type = TimelineEventType.Sfx,
              TriggerOffsetSeconds = request.TriggerOffsetSeconds ?? eventItem.TriggerOffsetSeconds,
              RequireManualInteraction = request.RequireManualInteraction ??
                                         eventItem.RequireManualInteraction,
              CustomName = request.CustomName ?? eventItem.CustomName,
              Sfx = new MediaEventPayload(
                request.Payload?.SfxId ?? eventItem.Sfx?.AssetId ?? string.Empty,
                request.Payload?.DurationSeconds ?? eventItem.Sfx?.DurationSeconds),
              Image = null
            },
            _ => eventItem
          };
        }).ToArray();

        return state with
        {
          ShowVersion = state.ShowVersion + 1,
          Timeline = updatedTimeline
        };
      },
      cancellationToken);
  }

  public async Task<ShowStateSnapshot> CreateNonResolveEventAsync(
    CreateTimelineEventRequest request, CancellationToken cancellationToken = default)
  {
    if (request.Type == TimelineEventType.Res)
      throw new InvalidOperationException("Resolve events are created only by XML import.");

    return await MutateAsync(request.ShowVersion, ShowRefetchReason.Optimized, state =>
    {
      EnsureTimelineWritable(state);
      var target = state.Timeline.Single(eventItem => eventItem.Id == request.RelativeToEventId);
      var position = request.Before ? target.Position : target.Position + 1;
      var nextId = state.Timeline.Count == 0
        ? 1
        : state.Timeline.Max(eventItem => eventItem.Id) + 1;
      var shifted = state.Timeline.Select(eventItem => eventItem.Position >= position
        ? eventItem with { Position = eventItem.Position + 1 }
        : eventItem);
      var media = new MediaEventPayload(
        request.Type == TimelineEventType.Img
          ? request.Payload?.ImageId ?? string.Empty
          : request.Payload?.SfxId ?? string.Empty,
        request.Payload?.DurationSeconds);
      var created = new TimelineEvent(
        nextId,
        position,
        request.Type == TimelineEventType.Img ? TimelineEventType.Img : TimelineEventType.Sfx,
        request.TriggerOffsetSeconds ?? 0,
        request.RequireManualInteraction ?? false,
        request.CustomName,
        null,
        request.Type == TimelineEventType.Img ? media : null,
        request.Type == TimelineEventType.Sfx ? media : null);
      return state with
      {
        ShowVersion = state.ShowVersion + 1,
        Timeline = shifted.Append(created).OrderBy(eventItem => eventItem.Position).ToArray()
      };
    }, cancellationToken);
  }

  public async Task<ShowStateSnapshot> PatchTimelineEventAsync(int eventId,
    PatchTimelineEventRequest request, CancellationToken cancellationToken = default)
  {
    return await MutateAsync(request.ShowVersion, ShowRefetchReason.Optimized, state =>
    {
      EnsureTimelineWritable(state);
      var current = state.Timeline.Single(eventItem => eventItem.Id == eventId);
      if (current.Type == TimelineEventType.Res)
        return state with
        {
          ShowVersion = state.ShowVersion + 1,
          Timeline = state.Timeline.Select(eventItem => eventItem.Id == eventId
            ? eventItem with { CustomName = request.CustomName ?? eventItem.CustomName }
            : eventItem).ToArray()
        };

      var type = request.Type switch
      {
        TimelineEventType.Img => TimelineEventType.Img,
        TimelineEventType.Sfx => TimelineEventType.Sfx,
        _ => current.Type
      };
      var assetId = type == TimelineEventType.Img
        ? request.Payload?.ImageId ?? current.Image?.AssetId ?? string.Empty
        : request.Payload?.SfxId ?? current.Sfx?.AssetId ?? string.Empty;
      var media = new MediaEventPayload(assetId,
        request.Payload?.DurationSeconds ??
        current.Image?.DurationSeconds ?? current.Sfx?.DurationSeconds);
      return state with
      {
        ShowVersion = state.ShowVersion + 1,
        Timeline = state.Timeline.Select(eventItem => eventItem.Id == eventId
          ? eventItem with
          {
            Type = type,
            CustomName = request.CustomName ?? eventItem.CustomName,
            TriggerOffsetSeconds = request.TriggerOffsetSeconds ?? eventItem.TriggerOffsetSeconds,
            RequireManualInteraction =
            request.RequireManualInteraction ?? eventItem.RequireManualInteraction,
            Image = type == TimelineEventType.Img ? media : null,
            Sfx = type == TimelineEventType.Sfx ? media : null
          }
          : eventItem).ToArray()
      };
    }, cancellationToken);
  }

  public async Task<ShowStateSnapshot> MoveNonResolveEventAsync(int eventId,
    MoveTimelineEventRequest request, CancellationToken cancellationToken = default)
  {
    return await MutateAsync(request.ShowVersion, ShowRefetchReason.Optimized, state =>
    {
      EnsureTimelineWritable(state);
      var item = state.Timeline.Single(eventItem => eventItem.Id == eventId);
      if (item.Type == TimelineEventType.Res)
        throw new InvalidOperationException("Resolve events cannot be reordered.");

      var target = state.Timeline.Single(eventItem => eventItem.Id == request.RelativeToEventId);
      var without = state.Timeline.Where(eventItem => eventItem.Id != eventId)
        .OrderBy(eventItem => eventItem.Position).ToList();
      var targetIndex = without.FindIndex(eventItem => eventItem.Id == target.Id);
      without.Insert(request.Before ? targetIndex : targetIndex + 1, item);
      return state with
      {
        ShowVersion = state.ShowVersion + 1,
        Timeline = without.Select((eventItem, index) => eventItem with { Position = index + 1 })
          .ToArray()
      };
    }, cancellationToken);
  }

  public async Task<ShowStateSnapshot> DeleteNonResolveEventAsync(int eventId,
    VersionedCommandRequest request, CancellationToken cancellationToken = default)
  {
    return await MutateAsync(request.ShowVersion, ShowRefetchReason.Optimized, state =>
    {
      EnsureTimelineWritable(state);
      var item = state.Timeline.Single(eventItem => eventItem.Id == eventId);
      if (item.Type == TimelineEventType.Res)
        throw new InvalidOperationException("Resolve events cannot be deleted.");

      return state with
      {
        ShowVersion = state.ShowVersion + 1,
        Timeline = state.Timeline.Where(eventItem => eventItem.Id != eventId)
          .Select((eventItem, index) => eventItem with { Position = index + 1 }).ToArray()
      };
    }, cancellationToken);
  }

  public async Task<ShowStateSnapshot> SetTimelineModeAsync(SetTimelineModeRequest request,
    CancellationToken cancellationToken = default)
  {
    return await MutateAsync(request.ShowVersion, ShowRefetchReason.Optimized, state => state with
    {
      ShowVersion = state.ShowVersion + 1,
      TimelineMode = request.TimelineMode
    }, cancellationToken);
  }

  public async Task<ShowStateSnapshot> UpsertAssetAsync(string assetId, UpsertAssetRequest request,
    CancellationToken cancellationToken = default)
  {
    return await MutateAsync(request.ShowVersion, ShowRefetchReason.Optimized, state =>
    {
      EnsureTimelineWritable(state);
      var asset = new ShowAsset(assetId, request.Kind, request.FileName, request.FileName,
        request.ContentType, Convert.FromBase64String(request.Bytes).LongLength, assetId);
      var images = state.Assets.Images.Where(existing => existing.Id != assetId).ToList();
      var sfx = state.Assets.Sfx.Where(existing => existing.Id != assetId).ToList();
      if (string.Equals(request.Kind, "image", StringComparison.OrdinalIgnoreCase))
        images.Add(asset);
      else if (string.Equals(request.Kind, "sfx", StringComparison.OrdinalIgnoreCase))
        sfx.Add(asset);
      else
        throw new InvalidOperationException("Asset kind must be image or sfx.");

      return state with
      {
        ShowVersion = state.ShowVersion + 1, Assets = new AssetCollection(images, sfx)
      };
    }, cancellationToken);
  }

  public async Task<ShowStateSnapshot> DeleteAssetAsync(string assetId,
    VersionedCommandRequest request, CancellationToken cancellationToken = default)
  {
    return await MutateAsync(request.ShowVersion, ShowRefetchReason.Optimized, state =>
    {
      EnsureTimelineWritable(state);
      return state with
      {
        ShowVersion = state.ShowVersion + 1,
        Assets = new AssetCollection(
          state.Assets.Images.Where(asset => asset.Id != assetId).ToArray(),
          state.Assets.Sfx.Where(asset => asset.Id != assetId).ToArray())
      };
    }, cancellationToken);
  }

  public async Task<ShowStateSnapshot> SetLiveModeAsync(bool enabled,
    CancellationToken cancellationToken = default)
  {
    var result = await MutateWithoutVersionAsync(
      state => state with
      {
        ShowVersion = state.ShowVersion + 1,
        Mode = enabled ? ShowMode.Live : ShowMode.Editing
      },
      cancellationToken);

    await hubContext.Clients.All.LiveModeChanged(
      new LiveModeChangedMessage(result.ShowVersion, result.Mode));
    return result;
  }

  public async Task<ShowStateSnapshot> StartPlaybackAsync(VersionedCommandRequest request,
    CancellationToken cancellationToken = default)
  {
    var result = await MutateAsync(
      request.ShowVersion,
      ShowRefetchReason.Optimized,
      state =>
      {
        var firstResolve =
          state.Timeline.FirstOrDefault(eventItem => eventItem.Type == TimelineEventType.Res);
        var nextResolve = state.Timeline
          .SkipWhile(eventItem => eventItem.Id != firstResolve?.Id)
          .Skip(1)
          .FirstOrDefault(eventItem => eventItem.Type == TimelineEventType.Res);
        var inlineIds = state.Timeline
          .Where(eventItem => firstResolve is not null && eventItem.Id > firstResolve.Id &&
                              eventItem.Id < (nextResolve?.Id ?? int.MaxValue) &&
                              eventItem.Type != TimelineEventType.Res)
          .Select(eventItem => eventItem.Id)
          .ToArray();

        return state with
        {
          ShowVersion = state.ShowVersion + 1,
          Playback = new PlaybackState(
            PlaybackStatus.Running,
            firstResolve?.Id,
            inlineIds.Length > 0 ? inlineIds[0] : firstResolve?.Id,
            firstResolve is null
              ? null
              : new ActivePlaybackSegment(
                firstResolve.Id,
                nextResolve?.Id,
                inlineIds,
                0),
            timeProvider.GetUtcNow().ToUnixTimeMilliseconds(),
            state.Playback.ExecutionSequence + 1)
        };
      },
      cancellationToken);

    await hubContext.Clients.All.PlaybackStateChanged(
      new PlaybackStateChangedMessage(result.ShowVersion, result.Playback));

    return result;
  }

  public async Task<ShowStateSnapshot> ResetPlaybackAsync(VersionedCommandRequest request,
    CancellationToken cancellationToken = default)
  {
    var result = await MutateAsync(
      request.ShowVersion,
      ShowRefetchReason.Optimized,
      state => state with
      {
        ShowVersion = state.ShowVersion + 1,
        Playback = new PlaybackState(PlaybackStatus.Idle, null, null, null, null,
          state.Playback.ExecutionSequence + 1)
      },
      cancellationToken);

    await hubContext.Clients.All.PlaybackStateChanged(
      new PlaybackStateChangedMessage(result.ShowVersion, result.Playback));

    return result;
  }

  public async Task<ShowStateSnapshot> SeekPlaybackAsync(SeekPlaybackRequest request,
    CancellationToken cancellationToken = default)
  {
    var result = await MutateAsync(
      request.ShowVersion,
      ShowRefetchReason.Optimized,
      state =>
      {
        var ordered = state.Timeline.OrderBy(eventItem => eventItem.Position).ToArray();
        var targetIndex = Array.FindIndex(ordered, eventItem => eventItem.Id == request.EventId);
        if (targetIndex < 0)
          throw new InvalidOperationException($"Timeline event {request.EventId} does not exist.");

        var currentResolve = ordered.Take(targetIndex + 1)
          .LastOrDefault(eventItem => eventItem.Type == TimelineEventType.Res);
        return state with
        {
          ShowVersion = state.ShowVersion + 1,
          Playback = new PlaybackState(
            PlaybackStatus.Paused,
            currentResolve?.Id,
            request.EventId,
            null,
            timeProvider.GetUtcNow().ToUnixTimeMilliseconds(),
            state.Playback.ExecutionSequence + 1)
        };
      },
      cancellationToken);

    await hubContext.Clients.All.PlaybackStateChanged(
      new PlaybackStateChangedMessage(result.ShowVersion, result.Playback));
    return result;
  }

  private async Task<ShowStateSnapshot> ReplaceAsync(
    ShowState nextState,
    ShowRefetchReason reason,
    CancellationToken cancellationToken)
  {
    var entity = await LoadEntityAsync(cancellationToken);
    entity.ShowVersion = nextState.ShowVersion;
    entity.PayloadJson = serializer.Serialize(nextState);
    entity.UpdatedAtUtc = timeProvider.GetUtcNow();
    await dbContext.SaveChangesAsync(cancellationToken);

    var snapshot = ShowContractMapper.ToContract(nextState);
    await hubContext.Clients.All.ShowRefetchRequired(
      new ShowRefetchRequiredMessage(snapshot.ShowVersion, reason));
    return snapshot;
  }

  private static void EnsureTimelineWritable(ShowState state)
  {
    if (state.TimelineMode == TimelineMode.Ro)
      throw new InvalidOperationException("Timeline is read-only.");
  }

  private async Task<ShowStateSnapshot> MutateWithoutVersionAsync(
    Func<ShowState, ShowState> mutation,
    CancellationToken cancellationToken)
  {
    var entity = await LoadEntityAsync(cancellationToken);
    var current = serializer.Deserialize<ShowState>(entity.PayloadJson);
    var updated = mutation(current);

    entity.ShowVersion = updated.ShowVersion;
    entity.PayloadJson = serializer.Serialize(updated);
    entity.UpdatedAtUtc = timeProvider.GetUtcNow();

    await dbContext.SaveChangesAsync(cancellationToken);
    return ShowContractMapper.ToContract(updated);
  }

  private async Task<ShowStateSnapshot> MutateAsync(
    int expectedShowVersion,
    ShowRefetchReason reason,
    Func<ShowState, ShowState> mutation,
    CancellationToken cancellationToken)
  {
    var entity = await LoadEntityAsync(cancellationToken);
    var current = serializer.Deserialize<ShowState>(entity.PayloadJson);

    if (current.ShowVersion != expectedShowVersion)
      throw new VersionDriftException(expectedShowVersion, current.ShowVersion);

    var updated = mutation(current);
    entity.ShowVersion = updated.ShowVersion;
    entity.PayloadJson = serializer.Serialize(updated);
    entity.UpdatedAtUtc = timeProvider.GetUtcNow();

    await dbContext.SaveChangesAsync(cancellationToken);

    var snapshot = ShowContractMapper.ToContract(updated);
    await hubContext.Clients.All.ShowRefetchRequired(
      new ShowRefetchRequiredMessage(snapshot.ShowVersion, reason));
    return snapshot;
  }

  private async Task<ShowState> LoadStateAsync(CancellationToken cancellationToken)
  {
    var entity = await LoadEntityAsync(cancellationToken);
    return serializer.Deserialize<ShowState>(entity.PayloadJson);
  }

  private async Task<StoredShowState> LoadEntityAsync(CancellationToken cancellationToken)
  {
    await EnsureSeededAsync(cancellationToken);
    var entity =
      await dbContext.ShowStates.SingleAsync(row => row.Id == LocalShowId, cancellationToken);
    return entity;
  }

  private static ShowState BuildShowFromXml(string xml, IReadOnlyList<string>? excludedUsernames,
    int showVersion)
  {
    var resolution = IcpcResolverEngine.Convert(xml, excludedUsernames);
    var runs = resolution.ResolveEvents
      .Select((resolve, index) => new TimelineEvent(
        index + 1,
        index + 1,
        TimelineEventType.Res,
        0,
        false,
        null,
        new ResolveEventPayload(
          resolve.RealName,
          resolve.Username,
          resolve.Problem,
          resolve.NewScore,
          resolve.NewRank),
        null,
        null))
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
      Contest = new ContestState(
        18_000,
        3_600,
        [
          new ContestTeam(1, "Alice Team", "alice", 100, 1),
          new ContestTeam(2, "Bob Team", "bob", 80, 2)
        ]),
      Timeline =
      [
        new TimelineEvent(
          1,
          1,
          TimelineEventType.Res,
          0,
          false,
          null,
          new ResolveEventPayload("Alice Team", "alice", "A", 100, 1),
          null,
          null),
        new TimelineEvent(
          2,
          2,
          TimelineEventType.Sfx,
          0.5,
          false,
          "Opening Sting",
          null,
          null,
          new MediaEventPayload("sting", 2.5)),
        new TimelineEvent(
          3,
          3,
          TimelineEventType.Img,
          1,
          false,
          "Title Board",
          null,
          new MediaEventPayload("award-board", 5),
          null),
        new TimelineEvent(
          4,
          4,
          TimelineEventType.Res,
          0,
          false,
          "Bob Reveal",
          new ResolveEventPayload("Bob Team", "bob", "B", 180, 2),
          null,
          null)
      ]
    };
  }

  private static ShowState CreateEmptyShow(int showVersion, ShowSource source)
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
      new AssetCollection(
        [
          new ShowAsset("award-board", "image", "award-board.png", "award-board.png", "image/png",
            0, "award-board")
        ],
        [
          new ShowAsset("sting", "sfx", "sting.mp3", "sting.mp3", "audio/mpeg", 0, "sting")
        ]),
      []);
  }
}