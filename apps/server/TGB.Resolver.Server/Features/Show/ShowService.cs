using System.Text;
using Microsoft.AspNetCore.SignalR;
using TGB.Resolver.Server.Commons.Serialization;
using TGB.Resolver.Server.Commons.Types;
using TGB.Resolver.Server.Features.Realtime;
using TGB.Resolver.Server.Features.Show.Data;
using TGB.Resolver.Server.Features.Show.Dto;

namespace TGB.Resolver.Server.Features.Show;

public sealed class ShowStateService(
  ShowRawRepository repository,
  AppJsonSerializer serializer,
  IHubContext<ShowHub, IShowHubClient> hubContext,
  TimeProvider timeProvider)
{
  public async Task EnsureSeededAsync(CancellationToken cancellationToken = default)
  {
    await repository.EnsureSeededAsync(cancellationToken);
  }

  public async Task<ShowStateSnapshot> GetSnapshotAsync(
    CancellationToken cancellationToken = default)
  {
    var state = await repository.GetStateAsync(cancellationToken);
    return ShowContractMapper.ToContract(state);
  }

  public async Task<ShowStateSnapshot> OptimizeAsync(VersionedCommandRequest request,
    CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateAsync(
      request.ShowVersion,
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

    return await BroadcastRefetchAsync(updated, ShowRefetchReason.Optimized, cancellationToken);
  }

  public async Task<ShowStateSnapshot> ClearAsync(VersionedCommandRequest request,
    CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateAsync(
      request.ShowVersion,
      state => ShowRawRepository.CreateEmptyShow(state.ShowVersion + 1, ShowSource.Manual),
      cancellationToken);

    return await BroadcastRefetchAsync(updated, ShowRefetchReason.ShowReplaced, cancellationToken);
  }

  public async Task<ShowStateSnapshot> ImportXmlAsync(ImportXmlRequest request,
    CancellationToken cancellationToken = default)
  {
    var current = await repository.GetStateAsync(cancellationToken);
    EnsureTimelineWritable(current);
    var next = ShowRawRepository.BuildShowFromXml(
      request.Xml, request.ExcludedUsernames, current.ShowVersion + 1);
    var updated = await repository.ReplaceAsync(next, cancellationToken);
    return await BroadcastRefetchAsync(updated, ShowRefetchReason.ShowReplaced, cancellationToken);
  }

  public async Task<ShowStateSnapshot> ImportBundleAsync(ImportBundleRequest request,
    CancellationToken cancellationToken = default)
  {
    var json = Encoding.UTF8.GetString(Convert.FromBase64String(request.Bytes));
    var imported = serializer.Deserialize<ShowState>(json) with
    {
      ShowVersion = (await repository.GetStateAsync(cancellationToken)).ShowVersion + 1,
      Meta = serializer.Deserialize<ShowState>(json).Meta with { Source = ShowSource.Bundle }
    };

    var updated = await repository.ReplaceAsync(imported, cancellationToken);
    return await BroadcastRefetchAsync(updated, ShowRefetchReason.ShowReplaced, cancellationToken);
  }

  public async Task<byte[]> ExportBundleAsync(CancellationToken cancellationToken = default)
  {
    var state = await repository.GetStateAsync(cancellationToken);
    return Encoding.UTF8.GetBytes(serializer.Serialize(state));
  }

  public async Task<ShowStateSnapshot> RenameResolveEventAsync(
    int eventId,
    ResolveEventRenameRequest request,
    CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateAsync(
      request.ShowVersion,
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

    return await BroadcastRefetchAsync(updated, ShowRefetchReason.Optimized, cancellationToken);
  }

  public async Task<ShowStateSnapshot> PatchNonResolveEventAsync(
    int eventId,
    NonResolveEventPatchRequest request,
    CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateAsync(
      request.ShowVersion,
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

    return await BroadcastRefetchAsync(updated, ShowRefetchReason.Optimized, cancellationToken);
  }

  public async Task<ShowStateSnapshot> CreateNonResolveEventAsync(
    CreateTimelineEventRequest request, CancellationToken cancellationToken = default)
  {
    if (request.Type == TimelineEventType.Res)
      throw new InvalidOperationException("Resolve events are created only by XML import.");

    var updated = await repository.MutateAsync(request.ShowVersion, state =>
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

    return await BroadcastRefetchAsync(updated, ShowRefetchReason.Optimized, cancellationToken);
  }

  public async Task<ShowStateSnapshot> PatchTimelineEventAsync(int eventId,
    PatchTimelineEventRequest request, CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateAsync(request.ShowVersion, state =>
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

    return await BroadcastRefetchAsync(updated, ShowRefetchReason.Optimized, cancellationToken);
  }

  public async Task<ShowStateSnapshot> MoveNonResolveEventAsync(int eventId,
    MoveTimelineEventRequest request, CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateAsync(request.ShowVersion, state =>
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

    return await BroadcastRefetchAsync(updated, ShowRefetchReason.Optimized, cancellationToken);
  }

  public async Task<ShowStateSnapshot> DeleteNonResolveEventAsync(int eventId,
    VersionedCommandRequest request, CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateAsync(request.ShowVersion, state =>
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

    return await BroadcastRefetchAsync(updated, ShowRefetchReason.Optimized, cancellationToken);
  }

  public async Task<ShowStateSnapshot> SetTimelineModeAsync(SetTimelineModeRequest request,
    CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateAsync(
      request.ShowVersion,
      state => state with
      {
        ShowVersion = state.ShowVersion + 1,
        TimelineMode = request.TimelineMode
      },
      cancellationToken);

    return await BroadcastRefetchAsync(updated, ShowRefetchReason.Optimized, cancellationToken);
  }

  public async Task<ShowStateSnapshot> UpsertAssetAsync(string assetId, UpsertAssetRequest request,
    CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateAsync(request.ShowVersion, state =>
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

    return await BroadcastRefetchAsync(updated, ShowRefetchReason.Optimized, cancellationToken);
  }

  public async Task<ShowStateSnapshot> DeleteAssetAsync(string assetId,
    VersionedCommandRequest request, CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateAsync(request.ShowVersion, state =>
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

    return await BroadcastRefetchAsync(updated, ShowRefetchReason.Optimized, cancellationToken);
  }

  public async Task<ShowStateSnapshot> SetLiveModeAsync(bool enabled,
    CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateWithoutVersionAsync(
      state => state with
      {
        ShowVersion = state.ShowVersion + 1,
        Mode = enabled ? ShowMode.Live : ShowMode.Editing
      },
      cancellationToken);

    var snapshot = ShowContractMapper.ToContract(updated);
    await hubContext.Clients.All.LiveModeChanged(
      new LiveModeChangedMessage(snapshot.ShowVersion, snapshot.Mode));
    return snapshot;
  }

  public async Task<ShowStateSnapshot> StartPlaybackAsync(VersionedCommandRequest request,
    CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateAsync(
      request.ShowVersion,
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

    var snapshot = ShowContractMapper.ToContract(updated);
    await hubContext.Clients.All.PlaybackStateChanged(
      new PlaybackStateChangedMessage(snapshot.ShowVersion, snapshot.Playback));
    return snapshot;
  }

  public async Task<ShowStateSnapshot> ResetPlaybackAsync(VersionedCommandRequest request,
    CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateAsync(
      request.ShowVersion,
      state => state with
      {
        ShowVersion = state.ShowVersion + 1,
        Playback = new PlaybackState(PlaybackStatus.Idle, null, null, null, null,
          state.Playback.ExecutionSequence + 1)
      },
      cancellationToken);

    var snapshot = ShowContractMapper.ToContract(updated);
    await hubContext.Clients.All.PlaybackStateChanged(
      new PlaybackStateChangedMessage(snapshot.ShowVersion, snapshot.Playback));
    return snapshot;
  }

  public async Task<ShowStateSnapshot> SeekPlaybackAsync(SeekPlaybackRequest request,
    CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateAsync(
      request.ShowVersion,
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

    var snapshot = ShowContractMapper.ToContract(updated);
    await hubContext.Clients.All.PlaybackStateChanged(
      new PlaybackStateChangedMessage(snapshot.ShowVersion, snapshot.Playback));
    return snapshot;
  }

  private static void EnsureTimelineWritable(ShowState state)
  {
    if (state.TimelineMode == TimelineMode.Ro)
      throw new InvalidOperationException("Timeline is read-only.");
  }

  private async Task<ShowStateSnapshot> BroadcastRefetchAsync(
    ShowState updated,
    ShowRefetchReason reason,
    CancellationToken cancellationToken)
  {
    var snapshot = ShowContractMapper.ToContract(updated);
    await hubContext.Clients.All.ShowRefetchRequired(
      new ShowRefetchRequiredMessage(snapshot.ShowVersion, reason));
    return snapshot;
  }

  private static ShowState CreateEmptyShow(int showVersion, ShowSource source)
  {
    return ShowRawRepository.CreateEmptyShow(showVersion, source);
  }
}