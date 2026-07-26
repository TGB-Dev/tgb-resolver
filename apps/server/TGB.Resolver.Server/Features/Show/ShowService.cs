using Microsoft.AspNetCore.SignalR;
using NodaTime;
using NodaTime.HighPerformance;
using TGB.Resolver.Server.Commons.Serialization;
using TGB.Resolver.Server.Commons.Types;
using TGB.Resolver.Server.Features.Assets;
using TGB.Resolver.Server.Features.Realtime;
using TGB.Resolver.Server.Features.Show.Data;
using TGB.Resolver.Server.Features.Show.Dto;
using TGB.Resolver.Server.Features.Show.Exporting;

namespace TGB.Resolver.Server.Features.Show;

public sealed class ShowStateService(
  ShowRawRepository repository,
  AppJsonSerializer serializer,
  IHubContext<ShowHub, IShowHubClient> hubContext,
  TimelineOrchestrator orchestrator,
  IClock clock,
  AssetStore assetStore)
{
  private Instant64 Now()
  {
    return Instant64.FromInstant(clock.GetCurrentInstant());
  }

  private long NowMs()
  {
    return Now().ToUnixTimeMilliseconds();
  }

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
          .Where(e => e.Type == TimelineEventType.Res || e.Type == TimelineEventType.Pre
                                                      || e.Image is not null || e.Sfx is not null
                                                      || e.Custom is not null)
          .Select((e, i) => e with { Position = i + 1 })
          .ToArray();

        return state with
        {
          ShowVersion = state.ShowVersion + 1,
          Timeline = normalized
        };
      },
      cancellationToken);

    return await BroadcastReorderedAsync(updated);
  }

  public async Task<ShowStateSnapshot> ClearAsync(VersionedCommandRequest request,
    CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateAsync(
      request.ShowVersion,
      state => ShowRawRepository.CreateEmptyShow(state.ShowVersion + 1, ShowSource.Manual),
      cancellationToken);

    return await BroadcastReplacedAsync(updated);
  }

  public async Task<ShowStateSnapshot> ImportXmlAsync(ImportXmlRequest request,
    CancellationToken cancellationToken = default)
  {
    var current = await repository.GetStateAsync(cancellationToken);
    EnsureTimelineWritable(current);
    var next = ShowRawRepository.BuildShowFromXml(
      request.Xml, request.ExcludedUsernames, current.ShowVersion + 1);
    var updated = await repository.ReplaceAsync(next, cancellationToken);
    return await BroadcastReplacedAsync(updated);
  }

  public async Task<ShowStateSnapshot> ImportBundleAsync(ImportBundleRequest request,
    CancellationToken cancellationToken = default)
  {
    var bytes = Convert.FromBase64String(request.Bytes);
    var imported =
      await ShowBundleArchive.UnpackAsync(bytes, serializer, assetStore, cancellationToken);
    var nextVersion = (await repository.GetStateAsync(cancellationToken)).ShowVersion + 1;
    var updated = await repository.ReplaceAsync(
      imported with
      {
        ShowVersion = nextVersion,
        Meta = imported.Meta with { Source = ShowSource.Bundle }
      },
      cancellationToken);
    return await BroadcastReplacedAsync(updated);
  }

  public async Task<byte[]> ExportBundleAsync(CancellationToken cancellationToken = default)
  {
    var state = await repository.GetStateAsync(cancellationToken);
    return await ShowBundleArchive.PackAsync(state, serializer, assetStore, cancellationToken);
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
        return state with
        {
          ShowVersion = state.ShowVersion + 1,
          Timeline = state.Timeline
            .Select(e => e.Id == eventId && e.Type == TimelineEventType.Res
              ? e with { CustomName = request.CustomName }
              : e)
            .ToArray()
        };
      },
      cancellationToken);

    return await BroadcastUpdatedAsync(updated, eventId);
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
        return state with
        {
          ShowVersion = state.ShowVersion + 1,
          Timeline = state.Timeline.Select(e =>
          {
            if (e.Id != eventId || e.Type == TimelineEventType.Res) return e;

            var (type, target, _) = request.Type switch
            {
              TimelineEventType.Img => (TimelineEventType.Img, e.Image, e.Sfx),
              TimelineEventType.Sfx => (TimelineEventType.Sfx, e.Sfx, e.Image),
              _ => (e.Type, null, null)
            };
            var custom = request.Type == TimelineEventType.Cus
              ? request.Custom
              : e.Custom;
            var assetId = request.Type == TimelineEventType.Img
              ? request.Payload?.ImageId ?? target?.AssetId ?? string.Empty
              : request.Payload?.SfxId ?? target?.AssetId ?? string.Empty;
            var media = new MediaEventPayload(
              assetId,
              request.Payload?.DurationSeconds ?? target?.DurationSeconds);

            return e with
            {
              Type = type,
              TriggerOffsetSeconds = request.TriggerOffsetSeconds ?? e.TriggerOffsetSeconds,
              RequireManualInteraction =
              request.RequireManualInteraction ?? e.RequireManualInteraction,
              CustomName = request.CustomName ?? e.CustomName,
              Image = type == TimelineEventType.Img ? media : null,
              Sfx = type == TimelineEventType.Sfx ? media : null,
              Custom = type == TimelineEventType.Cus ? custom : null
            };
          }).ToArray()
        };
      },
      cancellationToken);

    return await BroadcastUpdatedAsync(updated, eventId);
  }

  public async Task<ShowStateSnapshot> CreateNonResolveEventAsync(
    CreateTimelineEventRequest request, CancellationToken cancellationToken = default)
  {
    if (request.Type == TimelineEventType.Res)
      throw new InvalidOperationException("Resolve events are created only by XML import.");

    var updated = await repository.MutateAsync(request.ShowVersion, state =>
    {
      EnsureTimelineWritable(state);
      var target = state.Timeline.Single(e => e.Id == request.RelativeToEventId);
      var position = request.Before ? target.Position : target.Position + 1;
      var nextId = state.Timeline.Count == 0
        ? 1
        : state.Timeline.Max(e => e.Id) + 1;

      var shifted = state.Timeline.Select(e => e.Position >= position
        ? e with { Position = e.Position + 1 }
        : e);

      var isImg = request.Type == TimelineEventType.Img;
      var assetId = isImg
        ? request.Payload?.ImageId ?? string.Empty
        : request.Payload?.SfxId ?? string.Empty;
      var media = new MediaEventPayload(assetId, request.Payload?.DurationSeconds);
      var created = new TimelineEvent(
        nextId, position, request.Type,
        request.TriggerOffsetSeconds ?? 0, request.RequireManualInteraction ?? false,
        request.CustomName, null, isImg ? media : null, isImg ? null : media, null,
        request.Type == TimelineEventType.Cus ? request.Custom : null);

      return state with
      {
        ShowVersion = state.ShowVersion + 1,
        Timeline = shifted.Append(created).OrderBy(e => e.Position).ToArray()
      };
    }, cancellationToken);

    var createdId = updated.Timeline.Max(e => e.Id);
    return await BroadcastAddedAsync(updated, createdId);
  }

  public async Task<ShowStateSnapshot> PatchTimelineEventAsync(int eventId,
    PatchTimelineEventRequest request, CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateAsync(request.ShowVersion, state =>
    {
      EnsureTimelineWritable(state);
      var current = state.Timeline.Single(e => e.Id == eventId);

      if (current.Type == TimelineEventType.Res)
        return state with
        {
          ShowVersion = state.ShowVersion + 1,
          Timeline = state.Timeline
            .Select(e => e.Id == eventId
              ? e with { CustomName = request.CustomName ?? e.CustomName }
              : e)
            .ToArray()
        };

      var type = request.Type switch
      {
        TimelineEventType.Img => TimelineEventType.Img,
        TimelineEventType.Sfx => TimelineEventType.Sfx,
        TimelineEventType.Cus => TimelineEventType.Cus,
        _ => current.Type
      };
      var isImg = type == TimelineEventType.Img;
      var isCus = type == TimelineEventType.Cus;
      var custom = isCus ? request.Custom ?? current.Custom : null;
      var assetId = isImg
        ? request.Payload?.ImageId ?? current.Image?.AssetId ?? string.Empty
        : request.Payload?.SfxId ?? current.Sfx?.AssetId ?? string.Empty;
      var media = new MediaEventPayload(
        assetId,
        request.Payload?.DurationSeconds
        ?? current.Image?.DurationSeconds
        ?? current.Sfx?.DurationSeconds);

      return state with
      {
        ShowVersion = state.ShowVersion + 1,
        Timeline = state.Timeline
          .Select(e => e.Id == eventId
            ? e with
            {
              Type = type,
              CustomName = request.CustomName ?? e.CustomName,
              TriggerOffsetSeconds = request.TriggerOffsetSeconds ?? e.TriggerOffsetSeconds,
              RequireManualInteraction =
              request.RequireManualInteraction ?? e.RequireManualInteraction,
              Image = isImg ? media : null,
              Sfx = isImg ? null : media,
              Custom = isCus ? custom : null
            }
            : e)
          .ToArray()
      };
    }, cancellationToken);

    return await BroadcastUpdatedAsync(updated, eventId);
  }

  public async Task<ShowStateSnapshot> MoveNonResolveEventAsync(int eventId,
    MoveTimelineEventRequest request, CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateAsync(request.ShowVersion, state =>
    {
      EnsureTimelineWritable(state);
      var item = state.Timeline.Single(e => e.Id == eventId);
      if (item.Type == TimelineEventType.Res || item.Type == TimelineEventType.Pre)
        throw new InvalidOperationException("Resolve and pre-resolve events cannot be reordered.");

      var target = state.Timeline.Single(e => e.Id == request.RelativeToEventId);
      var without = state.Timeline.Where(e => e.Id != eventId)
        .OrderBy(e => e.Position).ToList();
      var targetIndex = without.FindIndex(e => e.Id == target.Id);
      without.Insert(request.Before ? targetIndex : targetIndex + 1, item);

      return state with
      {
        ShowVersion = state.ShowVersion + 1,
        Timeline = without.Select((e, i) => e with { Position = i + 1 }).ToArray()
      };
    }, cancellationToken);

    return await BroadcastReorderedAsync(updated);
  }

  public async Task<ShowStateSnapshot> DeleteNonResolveEventAsync(int eventId,
    VersionedCommandRequest request, CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateAsync(request.ShowVersion, state =>
    {
      EnsureTimelineWritable(state);
      var item = state.Timeline.Single(e => e.Id == eventId);
      if (item.Type == TimelineEventType.Res)
        throw new InvalidOperationException("Resolve events cannot be deleted.");

      return state with
      {
        ShowVersion = state.ShowVersion + 1,
        Timeline = state.Timeline.Where(e => e.Id != eventId)
          .Select((e, i) => e with { Position = i + 1 }).ToArray()
      };
    }, cancellationToken);

    return await BroadcastRemovedAsync(updated, eventId);
  }

  public async Task<ShowStateSnapshot> SetTimelineModeAsync(SetTimelineModeRequest request,
    CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateControlStateAsync(
      request.ShowVersion,
      state => state with
      {
        TimelineMode = request.TimelineMode
      },
      cancellationToken);

    return ShowContractMapper.ToContract(updated);
  }

  public async Task<ShowStateSnapshot> UpsertAssetAsync(string assetId, UpsertAssetRequest request,
    CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateControlStateAsync(request.ShowVersion, state =>
    {
      EnsureTimelineWritable(state);
      var asset = new ShowAsset(assetId, request.Kind, request.FileName, request.FileName,
        request.ContentType, Convert.FromBase64String(request.Bytes).LongLength, assetId);
      var images = state.Assets.Images.Where(a => a.Id != assetId).ToList();
      var sfx = state.Assets.Sfx.Where(a => a.Id != assetId).ToList();

      if (string.Equals(request.Kind, "image", StringComparison.OrdinalIgnoreCase))
        images.Add(asset);
      else if (string.Equals(request.Kind, "sfx", StringComparison.OrdinalIgnoreCase))
        sfx.Add(asset);
      else
        throw new InvalidOperationException("Asset kind must be image or sfx.");

      return state with
      {
        Assets = new AssetCollection(images, sfx)
      };
    }, cancellationToken);

    return ShowContractMapper.ToContract(updated);
  }

  public async Task<ShowStateSnapshot> DeleteAssetAsync(string assetId,
    VersionedCommandRequest request, CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateControlStateAsync(request.ShowVersion, state =>
    {
      EnsureTimelineWritable(state);
      return state with
      {
        Assets = new AssetCollection(
          state.Assets.Images.Where(a => a.Id != assetId).ToArray(),
          state.Assets.Sfx.Where(a => a.Id != assetId).ToArray())
      };
    }, cancellationToken);

    return ShowContractMapper.ToContract(updated);
  }

  public async Task<ShowStateSnapshot> SetLiveModeAsync(bool enabled,
    CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateControlStateAsync(
      state => state with
      {
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
    var updated = await repository.MutateControlStateAsync(
      request.ShowVersion,
      state =>
      {
        if (state.Playback.Status == PlaybackStatus.Running)
          return state with
          {
            Playback = NewPlayback(
              PlaybackStatus.Paused,
              state.Playback.CurrentEventId,
              state.Playback.ActiveEventIds,
              state.Playback.StartedAt)
          };

        if (state.Playback.Status == PlaybackStatus.Paused)
          return state with
          {
            Playback = NewPlayback(
              PlaybackStatus.Running,
              state.Playback.CurrentEventId,
              state.Playback.ActiveEventIds,
              state.Playback.StartedAt)
          };

        var ordered = state.Ordered();
        var firstEvent = ordered.FirstOrDefault();
        var startedAt = NowMs();

        return state with
        {
          Playback = NewPlayback(
            PlaybackStatus.Running,
            firstEvent?.Id,
            firstEvent is not null ? [firstEvent.Id] : [],
            firstEvent is not null ? startedAt : null)
        };
      },
      cancellationToken);

    await BroadcastPlaybackAsync(updated);

    if (updated.Playback.Status == PlaybackStatus.Running)
      ScheduleNextAdvanceAsync(updated);
    else
      orchestrator.CancelAdvance();

    return ShowContractMapper.ToContract(updated);
  }

  public async Task<ShowStateSnapshot> ResetPlaybackAsync(VersionedCommandRequest request,
    CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateControlStateAsync(
      request.ShowVersion,
      state => state with
      {
        Playback = NewPlayback(PlaybackStatus.Idle, null, [], null)
      },
      cancellationToken);

    await BroadcastPlaybackAsync(updated);
    orchestrator.CancelAdvance();
    return ShowContractMapper.ToContract(updated);
  }

  public async Task<ShowStateSnapshot> SeekPlaybackAsync(SeekPlaybackRequest request,
    CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateControlStateAsync(
      request.ShowVersion,
      state =>
      {
        var ordered = state.Ordered();
        var targetIndex = ordered.IndexOfEvent(request.EventId);
        if (targetIndex < 0)
          throw new InvalidOperationException($"Timeline event {request.EventId} does not exist.");

        return state with
        {
          Playback = NewPlayback(
            PlaybackStatus.Paused,
            request.EventId,
            [request.EventId],
            state.Playback.StartedAt)
        };
      },
      cancellationToken);

    await BroadcastPlaybackAsync(updated);
    orchestrator.CancelAdvance();
    return ShowContractMapper.ToContract(updated);
  }

  public async Task AdvancePlaybackAsync(CancellationToken cancellationToken)
  {
    var state = await repository.GetStateAsync(cancellationToken);
    if (state.Playback.Status != PlaybackStatus.Running)
      return;

    var ordered = state.Ordered();
    if (state.Playback.CurrentEventId is null)
    {
      var first = ordered.FirstOrDefault();
      if (first is null) return;
      var startedAt = NowMs();

      var updated = await repository.MutateControlStateAsync(
        s => s with
        {
          Playback = NewPlayback(
            PlaybackStatus.Running,
            first.Id,
            [first.Id],
            startedAt)
        },
        cancellationToken);

      await BroadcastPlaybackAsync(updated);
      ScheduleNextAdvanceAsync(updated);
      return;
    }

    var currentIndex = ordered.IndexOfEvent(state.Playback.CurrentEventId.Value);
    if (currentIndex < 0) return;

    if (currentIndex >= ordered.Length - 1)
    {
      await StopPlaybackAsync(cancellationToken);
      return;
    }

    var nextEvent = ordered[currentIndex + 1];
    var nextStartedAt = NowMs();

    var updated2 = await repository.MutateControlStateAsync(
      s => s with
      {
        Playback = NewPlayback(
          PlaybackStatus.Running,
          nextEvent.Id,
          [nextEvent.Id],
          nextStartedAt)
      },
      cancellationToken);

    await BroadcastPlaybackAsync(updated2);
    ScheduleNextAdvanceAsync(updated2);
  }

  public async Task RescheduleAdvanceAsync(CancellationToken cancellationToken = default)
  {
    var state = await repository.GetStateAsync(cancellationToken);
    if (state.Playback.Status == PlaybackStatus.Running)
      ScheduleNextAdvanceAsync(state);
  }

  private async Task StopPlaybackAsync(CancellationToken cancellationToken)
  {
    var updated = await repository.MutateControlStateAsync(
      s => s with
      {
        Playback = NewPlayback(PlaybackStatus.Idle, null, [], null)
      },
      cancellationToken);

    await BroadcastPlaybackAsync(updated);
    orchestrator.CancelAdvance();
  }

  private void ScheduleNextAdvanceAsync(ShowState state)
  {
    if (state.Playback.Status != PlaybackStatus.Running)
      return;

    var ordered = state.Ordered();
    var currentIndex = ordered.IndexOfEvent(state.Playback.CurrentEventId!.Value);
    if (currentIndex < 0 || currentIndex >= ordered.Length - 1)
      return;

    var nextEvent = ordered[currentIndex + 1];

    // Trigger offset always wins
    if (nextEvent.TriggerOffsetSeconds is not null)
    {
      orchestrator.ScheduleAdvance(Math.Max(1, (long)(nextEvent.TriggerOffsetSeconds.Value * 1000)));
      return;
    }

    // No explicit offset — check auto modes
    if (!state.Automation.FullAutoEnabled && !state.Automation.AutoResolveEnabled)
      return;

    if (!state.Automation.FullAutoEnabled && nextEvent.RequireManualInteraction == true)
      return;

    orchestrator.ScheduleAdvance(state.Automation.AutoResolveSpeedMs);
  }

  public async Task<ShowStateSnapshot> SetAutomationAsync(SetAutomationRequest request,
    CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateControlStateAsync(request.ShowVersion, state =>
    {
      var a = state.Automation;
      return state with
      {
        Automation = new AutomationState(
          request.AutoResolveEnabled ?? a.AutoResolveEnabled,
          request.AutoResolveSpeedMs ?? a.AutoResolveSpeedMs,
          request.FullAutoEnabled ?? a.FullAutoEnabled)
      };
    }, cancellationToken);

    if (updated.Playback.Status == PlaybackStatus.Running)
    {
      orchestrator.CancelAdvance();
      ScheduleNextAdvanceAsync(updated);
    }

    return ShowContractMapper.ToContract(updated);
  }

  private static void EnsureTimelineWritable(ShowState state)
  {
    if (state.TimelineMode == TimelineMode.Ro)
      throw new InvalidOperationException("Timeline is read-only.");
  }

  private async Task BroadcastPlaybackAsync(ShowState state)
  {
    var snapshot = ShowContractMapper.ToContract(state);
    await hubContext.Clients.All.PlaybackStateChanged(
      new PlaybackStateChangedMessage(snapshot.ShowVersion, snapshot.Playback));
  }

  private async Task<ShowStateSnapshot> BroadcastAddedAsync(
    ShowState updated, int eventId)
  {
    var snapshot = ShowContractMapper.ToContract(updated);
    var @event = snapshot.Timeline.Single(e => e.Id == eventId);
    await hubContext.Clients.All.TimelineEventAdded(
      new TimelineEventAddedMessage(snapshot.ShowVersion, @event));
    return snapshot;
  }

  private async Task<ShowStateSnapshot> BroadcastUpdatedAsync(
    ShowState updated, int eventId)
  {
    var snapshot = ShowContractMapper.ToContract(updated);
    var @event = snapshot.Timeline.Single(e => e.Id == eventId);
    await hubContext.Clients.All.TimelineEventUpdated(
      new TimelineEventUpdatedMessage(snapshot.ShowVersion, @event));
    return snapshot;
  }

  private async Task<ShowStateSnapshot> BroadcastRemovedAsync(
    ShowState updated, int eventId)
  {
    var snapshot = ShowContractMapper.ToContract(updated);
    await hubContext.Clients.All.TimelineEventRemoved(
      new TimelineEventRemovedMessage(snapshot.ShowVersion, eventId));
    return snapshot;
  }

  private async Task<ShowStateSnapshot> BroadcastReorderedAsync(
    ShowState updated)
  {
    var snapshot = ShowContractMapper.ToContract(updated);
    await hubContext.Clients.All.TimelineReordered(
      new TimelineReorderedMessage(
        snapshot.ShowVersion,
        updated.Timeline.OrderBy(e => e.Position).Select(e => e.Id).ToArray()));
    return snapshot;
  }

  private async Task<ShowStateSnapshot> BroadcastReplacedAsync(
    ShowState updated)
  {
    var snapshot = ShowContractMapper.ToContract(updated);
    await hubContext.Clients.All.ShowReplaced(new ShowReplacedMessage(snapshot.ShowVersion));
    return snapshot;
  }

  private static PlaybackState NewPlayback(
    PlaybackStatus status,
    int? currentEventId,
    IReadOnlyList<int> activeEventIds,
    long? startedAt)
  {
    return new PlaybackState(status, currentEventId, activeEventIds, startedAt);
  }
}