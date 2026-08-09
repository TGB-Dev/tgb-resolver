using System.IO.Hashing;
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
  RealtimeClock realtimeClock,
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
    var updated = await repository.MutateShowAsync(
      request.ShowVersion,
      state =>
      {
        var normalized = state.Timeline
          .Where(e => e.Type == TimelineEventType.Res || e.Type == TimelineEventType.Pre
                                                      || e.Custom is not null)
          .Select((e, i) => e with { Position = i + 1 })
          .ToArray();

        return state with { Timeline = normalized };
      },
      cancellationToken);

    return await BroadcastReorderedAsync(updated);
  }

  public async Task<ShowStateSnapshot> ClearAsync(VersionedCommandRequest request,
    CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateShowAsync(
      request.ShowVersion,
      state => ShowRawRepository.CreateEmptyShow(state.ShowVersion, ShowSource.Manual),
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
    var updated = await repository.MutateShowAsync(
      request.ShowVersion,
      state =>
      {
        EnsureTimelineWritable(state);
        return state with
        {
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
    EnsureFiniteOrNull(request.TriggerOffsetSeconds, nameof(request.TriggerOffsetSeconds));

    var updated = await repository.MutateShowAsync(
      request.ShowVersion,
      state =>
      {
        EnsureTimelineWritable(state);
        return state with
        {
          Timeline = state.Timeline.Select(e =>
          {
            if (e.Id != eventId || e.Type == TimelineEventType.Res) return e;

            return e with
            {
              TriggerOffsetSeconds = request.TriggerOffsetSeconds ?? e.TriggerOffsetSeconds,
              RequireManualInteraction =
              request.RequireManualInteraction ?? e.RequireManualInteraction,
              CustomName = request.CustomName ?? e.CustomName,
              Custom = e.Type == TimelineEventType.Cus
                ? ToData(request.Custom) ?? e.Custom
                : e.Custom
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
    EnsureFiniteOrNull(request.DurationSeconds, nameof(request.DurationSeconds));
    EnsureFiniteOrNull(request.TriggerOffsetSeconds, nameof(request.TriggerOffsetSeconds));

    var updated = await repository.MutateShowAsync(request.ShowVersion, state =>
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

      var created = new TimelineEvent(
        nextId, position, TimelineEventType.Cus, request.DurationSeconds,
        request.TriggerOffsetSeconds, request.RequireManualInteraction ?? false,
        request.CustomName, null, null, ToData(request.Custom));

      return state with
      {
        Timeline = shifted.Append(created).OrderBy(e => e.Position).ToArray()
      };
    }, cancellationToken);

    var createdId = updated.Timeline.Max(e => e.Id);
    return await BroadcastAddedAsync(updated, createdId);
  }

  public async Task<ShowStateSnapshot> PatchTimelineEventAsync(int eventId,
    PatchTimelineEventRequest request, CancellationToken cancellationToken = default)
  {
    EnsureFiniteOrNull(request.DurationSeconds, nameof(request.DurationSeconds));
    EnsureFiniteOrNull(request.TriggerOffsetSeconds, nameof(request.TriggerOffsetSeconds));

    var updated = await repository.MutateShowAsync(request.ShowVersion, state =>
    {
      EnsureTimelineWritable(state);
      var current = state.Timeline.Single(e => e.Id == eventId);

      if (current.Type == TimelineEventType.Res)
        return state with
        {
          Timeline = state.Timeline
            .Select(e => e.Id == eventId
              ? e with
              {
                CustomName = request.CustomName ?? e.CustomName,
                DurationSeconds = request.UseDefaultDuration
                  ? null
                  : request.DurationSeconds ?? e.DurationSeconds,
                TriggerOffsetSeconds = request.ClearTriggerOffset
                  ? null
                  : request.TriggerOffsetSeconds ?? e.TriggerOffsetSeconds,
                RequireManualInteraction =
                request.RequireManualInteraction ?? e.RequireManualInteraction
              }
              : e)
            .ToArray()
        };

      var custom = current.Type == TimelineEventType.Cus
        ? ToData(request.Custom) ?? current.Custom
        : null;

      return state with
      {
        Timeline = state.Timeline
          .Select(e => e.Id == eventId
            ? e with
            {
              CustomName = request.CustomName ?? e.CustomName,
              DurationSeconds = request.UseDefaultDuration
                ? null
                : request.DurationSeconds ?? e.DurationSeconds,
              TriggerOffsetSeconds = request.ClearTriggerOffset
                ? null
                : request.TriggerOffsetSeconds ?? e.TriggerOffsetSeconds,
              RequireManualInteraction =
              request.RequireManualInteraction ?? e.RequireManualInteraction,
              Custom = custom
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
    var updated = await repository.MutateShowAsync(request.ShowVersion, state =>
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
        Timeline = without.Select((e, i) => e with { Position = i + 1 }).ToArray()
      };
    }, cancellationToken);

    return await BroadcastReorderedAsync(updated);
  }

  public async Task<ShowStateSnapshot> DeleteNonResolveEventAsync(int eventId,
    VersionedCommandRequest request, CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateShowAsync(request.ShowVersion, state =>
    {
      EnsureTimelineWritable(state);
      var item = state.Timeline.Single(e => e.Id == eventId);
      if (item.Type == TimelineEventType.Res || item.Type == TimelineEventType.Pre)
        throw new InvalidOperationException("Resolve and pre-resolve events cannot be deleted.");

      return state with
      {
        Timeline = state.Timeline.Where(e => e.Id != eventId)
          .Select((e, i) => e with { Position = i + 1 }).ToArray()
      };
    }, cancellationToken);

    return await BroadcastRemovedAsync(updated, eventId);
  }

  public async Task<ShowStateSnapshot> SetTimelineModeAsync(SetTimelineModeRequest request,
    CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateShowAsync(
      request.ShowVersion,
      state => state with
      {
        TimelineMode = request.TimelineMode
      },
      cancellationToken);

    return await BroadcastReplacedAsync(updated);
  }

  public async Task<ShowStateSnapshot> UpsertAssetAsync(string assetId, UpsertAssetRequest request,
    CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateShowAsync(request.ShowVersion, state =>
    {
      EnsureTimelineWritable(state);
      var rawBytes = Convert.FromBase64String(request.Bytes);
      var xxh3 = Convert.ToHexString(XxHash3.Hash(rawBytes));
      var asset = new ShowAsset(assetId, request.FileName, request.FileName,
        request.ContentType, rawBytes.LongLength, xxh3)
      {
        FolderId = request.FolderId
      };
      var items = state.Assets.Items.Where(a => a.Id != assetId).ToList();
      items.Add(asset);

      return state with
      {
        Assets = new AssetCollection(items) { Folders = state.Assets.Folders }
      };
    }, cancellationToken);

    return await BroadcastReplacedAsync(updated);
  }

  public async Task<ShowStateSnapshot> DeleteEntryAsync(DeleteEntryRequest request,
    CancellationToken cancellationToken = default)
  {
    return request.IsDirectory
      ? await DeleteFolderInternalAsync(request, cancellationToken)
      : await DeleteAssetInternalAsync(request, cancellationToken);
  }

  public async Task<ShowStateSnapshot> RenameEntryAsync(RenameEntryRequest request,
    CancellationToken cancellationToken = default)
  {
    return request.IsDirectory
      ? await RenameFolderInternalAsync(request, cancellationToken)
      : await RenameAssetInternalAsync(request, cancellationToken);
  }

  private async Task<ShowStateSnapshot> DeleteAssetInternalAsync(DeleteEntryRequest request,
    CancellationToken cancellationToken)
  {
    var updated = await repository.MutateShowAsync(request.ShowVersion, state =>
    {
      EnsureTimelineWritable(state);
      return state with
      {
        Assets = new AssetCollection(
            state.Assets.Items.Where(a => a.Id != request.Id).ToArray())
          { Folders = state.Assets.Folders }
      };
    }, cancellationToken);

    return await BroadcastReplacedAsync(updated);
  }

  private async Task<ShowStateSnapshot> RenameAssetInternalAsync(RenameEntryRequest request,
    CancellationToken cancellationToken)
  {
    var updated = await repository.MutateShowAsync(request.ShowVersion, state =>
    {
      EnsureTimelineWritable(state);
      var items = state.Assets.Items
        .Select(a => a.Id == request.Id ? a with { FileName = request.NewName } : a)
        .ToArray();
      return state with
      {
        Assets = new AssetCollection(items) { Folders = state.Assets.Folders }
      };
    }, cancellationToken);

    return await BroadcastReplacedAsync(updated);
  }

  public async Task<ShowStateSnapshot> CreateFolderAsync(CreateFolderRequest request,
    CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateShowAsync(request.ShowVersion, state =>
    {
      EnsureTimelineWritable(state);
      var folderId = Guid.NewGuid().ToString("N");
      var folder = new FolderNode(folderId, request.Name, []);
      var folders = string.IsNullOrEmpty(request.ParentFolderId)
        ? [.. state.Assets.Folders, folder]
        : InsertFolderNode(state.Assets.Folders, request.ParentFolderId, folder).Nodes;
      return state with
      {
        Assets = state.Assets with
        {
          Folders = folders
        }
      };
    }, cancellationToken);

    return await BroadcastReplacedAsync(updated);
  }

  private async Task<ShowStateSnapshot> RenameFolderInternalAsync(RenameEntryRequest request,
    CancellationToken cancellationToken)
  {
    var updated = await repository.MutateShowAsync(request.ShowVersion, state =>
    {
      EnsureTimelineWritable(state);
      var folders =
        RenameFolderNode(state.Assets.Folders, request.Id, request.NewName).Nodes;
      return state with
      {
        Assets = state.Assets with
        {
          Folders = folders
        }
      };
    }, cancellationToken);

    return await BroadcastReplacedAsync(updated);
  }

  private async Task<ShowStateSnapshot> DeleteFolderInternalAsync(DeleteEntryRequest request,
    CancellationToken cancellationToken)
  {
    var updated = await repository.MutateShowAsync(request.ShowVersion, state =>
    {
      EnsureTimelineWritable(state);
      var folderIdsToClear = CollectDescendantFolderIds(state.Assets.Folders, request.Id);
      var folders = RemoveFolderNode(state.Assets.Folders, request.Id).Nodes;
      var items = state.Assets.Items
        .Select(a => a.FolderId is not null && folderIdsToClear.Contains(a.FolderId)
          ? a with { FolderId = null }
          : a)
        .ToArray();
      return state with
      {
        Assets = new AssetCollection(items) { Folders = folders }
      };
    }, cancellationToken);

    return await BroadcastReplacedAsync(updated);
  }

  public async Task<ShowStateSnapshot> MoveAssetAsync(MoveAssetRequest request,
    CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateShowAsync(request.ShowVersion, state =>
    {
      EnsureTimelineWritable(state);
      var targetFolderId = ValidateTargetFolder(state.Assets.Folders, request.TargetFolderId);
      var source = state.Assets.Items.FirstOrDefault(a => a.Id == request.AssetId)
                   ?? throw new InvalidOperationException(
                     $"Asset '{request.AssetId}' does not exist.");
      if (NormalizeFolderId(source.FolderId) == targetFolderId)
        throw new InvalidOperationException("Asset is already in the target folder.");

      var items = state.Assets.Items
        .Select(a =>
          a.Id == request.AssetId ? a with { FolderId = targetFolderId ?? string.Empty } : a)
        .ToArray();
      return state with
      {
        Assets = new AssetCollection(items) { Folders = state.Assets.Folders }
      };
    }, cancellationToken);

    return await BroadcastReplacedAsync(updated);
  }

  public async Task<ShowStateSnapshot> TransferEntryAsync(TransferEntryRequest request,
    CancellationToken cancellationToken = default)
  {
    if (request.IsDirectory)
      return request.Copy
        ? await CopyFolderInternalAsync(request, cancellationToken)
        : await MoveFolderInternalAsync(request, cancellationToken);

    return request.Copy
      ? await CopyAssetInternalAsync(request, cancellationToken)
      : await MoveAssetAsync(
        new MoveAssetRequest(request.ShowVersion, request.Id,
          request.TargetFolderId ?? string.Empty),
        cancellationToken);
  }

  private async Task<ShowStateSnapshot> CopyAssetInternalAsync(TransferEntryRequest request,
    CancellationToken cancellationToken)
  {
    var current = await repository.GetStateAsync(cancellationToken);
    EnsureTimelineWritable(current);
    var targetFolderId = ValidateTargetFolder(current.Assets.Folders, request.TargetFolderId);
    var source = current.Assets.Items.FirstOrDefault(a => a.Id == request.Id)
                 ?? throw new InvalidOperationException($"Asset '{request.Id}' does not exist.");

    var clonedId = Guid.NewGuid().ToString("N");
    var bytes = await assetStore.ReadAsync(source.Id, cancellationToken);
    await assetStore.SaveAsync(clonedId, bytes, cancellationToken);

    try
    {
      var updated = await repository.MutateShowAsync(request.ShowVersion, state =>
      {
        EnsureTimelineWritable(state);
        var target = ValidateTargetFolder(state.Assets.Folders, targetFolderId);
        var stateSource = state.Assets.Items.FirstOrDefault(a => a.Id == request.Id)
                          ?? throw new InvalidOperationException(
                            $"Asset '{request.Id}' no longer exists.");
        var clone = stateSource with { Id = clonedId, FolderId = target ?? string.Empty };
        var items = state.Assets.Items.Append(clone).ToArray();
        return state with
        {
          Assets = new AssetCollection(items) { Folders = state.Assets.Folders }
        };
      }, cancellationToken);

      return await BroadcastReplacedAsync(updated);
    }
    catch
    {
      await assetStore.DeleteAsync(clonedId);
      throw;
    }
  }

  private async Task<ShowStateSnapshot> MoveFolderInternalAsync(TransferEntryRequest request,
    CancellationToken cancellationToken)
  {
    var targetFolderId = NormalizeFolderId(request.TargetFolderId);
    var updated = await repository.MutateShowAsync(request.ShowVersion, state =>
    {
      EnsureTimelineWritable(state);
      var target = ValidateTargetFolder(state.Assets.Folders, targetFolderId);

      var (foldersWithoutSource, sourceFolder, found) =
        ExtractFolderNode(state.Assets.Folders, request.Id);
      if (!found || sourceFolder is null)
        throw new InvalidOperationException($"Folder '{request.Id}' does not exist.");

      if (target == request.Id)
        throw new InvalidOperationException("Folder cannot be moved into itself.");
      if (target is not null && IsDescendantFolder(state.Assets.Folders, request.Id, target))
        throw new InvalidOperationException("Folder cannot be moved into one of its descendants.");
      if (FindParentFolderId(state.Assets.Folders, request.Id) == target)
        throw new InvalidOperationException("Folder is already in the target folder.");

      var folders = target is null
        ? [.. foldersWithoutSource, sourceFolder]
        : InsertFolderNode(foldersWithoutSource, target, sourceFolder).Nodes;

      return state with
      {
        Assets = state.Assets with
        {
          Folders = folders
        }
      };
    }, cancellationToken);

    return await BroadcastReplacedAsync(updated);
  }

  private async Task<ShowStateSnapshot> CopyFolderInternalAsync(TransferEntryRequest request,
    CancellationToken cancellationToken)
  {
    var targetFolderId = NormalizeFolderId(request.TargetFolderId);
    var current = await repository.GetStateAsync(cancellationToken);
    EnsureTimelineWritable(current);
    targetFolderId = ValidateTargetFolder(current.Assets.Folders, targetFolderId);

    if (targetFolderId is not null && targetFolderId == request.Id)
      throw new InvalidOperationException("Folder cannot be copied into itself.");
    if (targetFolderId is not null &&
        IsDescendantFolder(current.Assets.Folders, request.Id, targetFolderId))
      throw new InvalidOperationException("Folder cannot be copied into one of its descendants.");

    var sourceFolder = FindFolderNode(current.Assets.Folders, request.Id)
                       ?? throw new InvalidOperationException(
                         $"Folder '{request.Id}' does not exist.");
    var folderIdMap = new Dictionary<string, string>();
    var clonedFolder = CloneFolderTree(sourceFolder, folderIdMap);
    var sourceFolderIds = CollectAllFolderIds(sourceFolder).ToHashSet();

    var sourceAssets = current.Assets.Items
      .Where(a => a.FolderId is not null && sourceFolderIds.Contains(a.FolderId))
      .ToArray();

    var clonedAssets = new List<ShowAsset>(sourceAssets.Length);
    try
    {
      foreach (var sourceAsset in sourceAssets)
      {
        var clonedId = Guid.NewGuid().ToString("N");
        var bytes = await assetStore.ReadAsync(sourceAsset.Id, cancellationToken);
        await assetStore.SaveAsync(clonedId, bytes, cancellationToken);

        clonedAssets.Add(sourceAsset with
        {
          Id = clonedId,
          FolderId = sourceAsset.FolderId is null ? null : folderIdMap[sourceAsset.FolderId]
        });
      }

      var updated = await repository.MutateShowAsync(request.ShowVersion, state =>
      {
        EnsureTimelineWritable(state);
        var target = ValidateTargetFolder(state.Assets.Folders, targetFolderId);
        var stateSourceFolder = FindFolderNode(state.Assets.Folders, request.Id);
        if (stateSourceFolder is null || !FolderTreesMatch(sourceFolder, stateSourceFolder) ||
            sourceAssets.Any(sourceAsset => !state.Assets.Items.Contains(sourceAsset)))
          throw new InvalidOperationException(
            $"Folder '{request.Id}' changed before it could be copied.");

        var folders = target is null
          ? [.. state.Assets.Folders, clonedFolder]
          : InsertFolderNode(state.Assets.Folders, target, clonedFolder).Nodes;

        var items = state.Assets.Items.Concat(clonedAssets).ToArray();
        return state with
        {
          Assets = new AssetCollection(items) { Folders = folders }
        };
      }, cancellationToken);

      return await BroadcastReplacedAsync(updated);
    }
    catch
    {
      foreach (var clonedAsset in clonedAssets)
        await assetStore.DeleteAsync(clonedAsset.Id);
      throw;
    }
  }

  private static string? NormalizeFolderId(string? folderId)
  {
    return string.IsNullOrWhiteSpace(folderId) ? null : folderId;
  }

  private static string? ValidateTargetFolder(IReadOnlyList<FolderNode> folders,
    string? targetFolderId)
  {
    var normalizedTargetFolderId = NormalizeFolderId(targetFolderId);
    if (normalizedTargetFolderId is not null &&
        FindFolderNode(folders, normalizedTargetFolderId) is null)
      throw new InvalidOperationException(
        $"Target folder '{normalizedTargetFolderId}' does not exist.");

    return normalizedTargetFolderId;
  }

  private static string? FindParentFolderId(IReadOnlyList<FolderNode> folders, string folderId)
  {
    foreach (var folder in folders)
    {
      if (folder.Children.Any(child => child.Id == folderId)) return folder.Id;
      var parentId = FindParentFolderId(folder.Children, folderId);
      if (parentId is not null) return parentId;
    }

    return null;
  }

  private static bool FolderTreesMatch(FolderNode expected, FolderNode actual)
  {
    return expected.Id == actual.Id && expected.Name == actual.Name &&
           expected.Children.Count == actual.Children.Count &&
           expected.Children.Zip(actual.Children)
             .All(pair => FolderTreesMatch(pair.First, pair.Second));
  }

  private static (IReadOnlyList<FolderNode> Nodes, bool Changed) InsertFolderNode(
    IReadOnlyList<FolderNode> nodes, string parentId, FolderNode newNode)
  {
    var list = nodes.ToList();
    for (var i = 0; i < list.Count; i++)
    {
      if (list[i].Id == parentId)
      {
        list[i] = list[i] with
        {
          Children = [.. list[i].Children, newNode]
        };
        return (list, true);
      }

      var (updatedChildren, changed) = InsertFolderNode(list[i].Children, parentId, newNode);
      if (!changed) continue;
      list[i] = list[i] with { Children = updatedChildren };
      return (list, true);
    }

    return (nodes, false);
  }

  private static (IReadOnlyList<FolderNode> Nodes, FolderNode? Node, bool Found) ExtractFolderNode(
    IReadOnlyList<FolderNode> nodes, string folderId)
  {
    var list = nodes.ToList();
    for (var i = 0; i < list.Count; i++)
    {
      if (list[i].Id == folderId)
      {
        var node = list[i];
        list.RemoveAt(i);
        return (list, node, true);
      }

      var (updatedChildren, extracted, found) = ExtractFolderNode(list[i].Children, folderId);
      if (!found) continue;
      list[i] = list[i] with { Children = updatedChildren };
      return (list, extracted, true);
    }

    return (nodes, null, false);
  }

  private static (IReadOnlyList<FolderNode> Nodes, bool Changed) RenameFolderNode(
    IReadOnlyList<FolderNode> nodes, string folderId, string newName)
  {
    var list = nodes.ToList();
    for (var i = 0; i < list.Count; i++)
    {
      if (list[i].Id == folderId)
      {
        list[i] = list[i] with { Name = newName };
        return (list, true);
      }

      var (updatedChildren, changed) = RenameFolderNode(list[i].Children, folderId, newName);
      if (!changed) continue;
      list[i] = list[i] with { Children = updatedChildren };
      return (list, true);
    }

    return (nodes, false);
  }

  private static (IReadOnlyList<FolderNode> Nodes, bool Changed) RemoveFolderNode(
    IReadOnlyList<FolderNode> nodes, string folderId)
  {
    var list = nodes.ToList();
    for (var i = list.Count - 1; i >= 0; i--)
    {
      if (list[i].Id == folderId)
      {
        list.RemoveAt(i);
        return (list, true);
      }

      var (updatedChildren, changed) = RemoveFolderNode(list[i].Children, folderId);
      if (!changed) continue;
      list[i] = list[i] with { Children = updatedChildren };
      return (list, true);
    }

    return (nodes, false);
  }

  private static HashSet<string> CollectDescendantFolderIds(
    IReadOnlyList<FolderNode> nodes, string folderId)
  {
    var result = new HashSet<string> { folderId };
    foreach (var node in nodes)
      if (node.Id == folderId)
        CollectAllFolderIds(node, result);
      else
        CollectDescendantFolderIds(node.Children, folderId, result);
    return result;
  }

  private static FolderNode? FindFolderNode(IReadOnlyList<FolderNode> nodes, string folderId)
  {
    foreach (var node in nodes)
    {
      if (node.Id == folderId)
        return node;

      var found = FindFolderNode(node.Children, folderId);
      if (found is not null)
        return found;
    }

    return null;
  }

  private static bool IsDescendantFolder(IReadOnlyList<FolderNode> nodes, string sourceFolderId,
    string maybeDescendantId)
  {
    var source = FindFolderNode(nodes, sourceFolderId);
    if (source is null)
      return false;

    return CollectAllFolderIds(source).Contains(maybeDescendantId);
  }

  private static FolderNode CloneFolderTree(FolderNode source, Dictionary<string, string> idMap)
  {
    var clonedId = Guid.NewGuid().ToString("N");
    idMap[source.Id] = clonedId;

    return source with
    {
      Id = clonedId,
      Children = source.Children.Select(child => CloneFolderTree(child, idMap)).ToArray()
    };
  }

  private static IEnumerable<string> CollectAllFolderIds(FolderNode node)
  {
    yield return node.Id;
    foreach (var child in node.Children)
    foreach (var childId in CollectAllFolderIds(child))
      yield return childId;
  }

  private static void CollectAllFolderIds(FolderNode node, HashSet<string> ids)
  {
    ids.Add(node.Id);
    foreach (var child in node.Children)
      CollectAllFolderIds(child, ids);
  }

  private static void CollectDescendantFolderIds(
    IReadOnlyList<FolderNode> nodes, string folderId, HashSet<string> result)
  {
    foreach (var node in nodes)
      if (node.Id == folderId)
        CollectAllFolderIds(node, result);
      else
        CollectDescendantFolderIds(node.Children, folderId, result);
  }

  public async Task<ShowStateSnapshot> SetLiveModeAsync(bool enabled,
    CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateShowAsync(
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
    var updated = await repository.MutatePlaybackAsync(
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
            firstEvent is not null ? ComputeActiveEventIds(ordered, 0) : [],
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
    var updated = await repository.MutatePlaybackAsync(
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
    var updated = await repository.MutatePlaybackAsync(
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
            state.Playback.Status,
            request.EventId,
            ComputeActiveEventIds(ordered, targetIndex),
            state.Playback.StartedAt)
        };
      },
      cancellationToken);

    await BroadcastPlaybackAsync(updated);
    // A seek jumps to a different point in the timeline: the pending schedule
    // was computed for the old current event, so drop it and re-schedule from
    // the new current event when still running (otherwise trigger-offset
    // children of the target would never fire).
    orchestrator.CancelAdvance();
    if (updated.Playback.Status == PlaybackStatus.Running)
      ScheduleNextAdvanceAsync(updated);
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

      var updated = await repository.MutatePlaybackAsync(
        s => s with
        {
          Playback = NewPlayback(
            PlaybackStatus.Running,
            first.Id,
            ComputeActiveEventIds(ordered, 0),
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

    var updated2 = await repository.MutatePlaybackAsync(
      s => s with
      {
        Playback = NewPlayback(
          PlaybackStatus.Running,
          nextEvent.Id,
          ComputeActiveEventIds(ordered, currentIndex + 1),
          state.Playback.StartedAt)
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
    var updated = await repository.MutatePlaybackAsync(
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

    var currentEvent = ordered[currentIndex];
    var nextEvent = ordered[currentIndex + 1];

    // Next event's trigger offset: explicit per-event override.
    // 0 = concurrent at previous start, negative = fires before the previous event.
    if (nextEvent.TriggerOffsetSeconds is not null)
    {
      orchestrator.ScheduleAdvance(Math.Max(0, ToMs(nextEvent.TriggerOffsetSeconds.Value)));
      return;
    }

    // No auto-advance when both auto modes are off
    if (state.Automation is { FullAutoEnabled: false, AutoResolveEnabled: false })
      return;

    if (!state.Automation.FullAutoEnabled && nextEvent.RequireManualInteraction == true)
      return;

    // Hold the next event until the CURRENT event finishes (its own duration wins).
    orchestrator.ScheduleAdvance(ToMs(currentEvent.DurationSeconds ??
                                      state.Automation.AutoResolveSpeedMs / 1000d));
  }

  public async Task<ShowStateSnapshot> SetAutomationAsync(SetAutomationRequest request,
    CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateShowAsync(request.ShowVersion, state =>
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

    return await BroadcastReplacedAsync(updated);
  }

  public async Task<ShowStateSnapshot> SetSettingsAsync(SetSettingsRequest request,
    CancellationToken cancellationToken = default)
  {
    var updated = await repository.MutateShowAsync(request.ShowVersion, state =>
      state with { TickRate = request.TickRate }, cancellationToken);

    realtimeClock.SetTickRate(request.TickRate);
    return await BroadcastReplacedAsync(updated);
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

  private static void EnsureFiniteOrNull(double? value, string fieldName)
  {
    if (value is { } v && !double.IsFinite(v))
      throw new ArgumentException($"{fieldName} must be a finite number.", fieldName);
  }

  private static long ToMs(double seconds)
  {
    return (long)(seconds * 1000);
  }

  private static IReadOnlyList<int> ComputeActiveEventIds(
    TimelineEvent[] ordered, int currentIndex)
  {
    if (currentIndex < 0 || currentIndex >= ordered.Length)
      return [];

    // Trace back to the group parent of the current concurrent group.
    var parentIndex = currentIndex;
    while (parentIndex > 0 && ordered[parentIndex].TriggerOffsetSeconds is not null) parentIndex--;

    // Include the group parent through the current active event (all triggered so far).
    var ids = new List<int>();
    for (var i = parentIndex; i <= currentIndex; i++) ids.Add(ordered[i].Id);

    // Plus any immediate 0-second (simultaneous) offset events right after current.
    for (var i = currentIndex + 1;
         i < ordered.Length && ordered[i].TriggerOffsetSeconds == 0;
         i++)
      ids.Add(ordered[i].Id);

    return ids;
  }

  private static CustomEventPayload? ToData(CustomEventPayloadSnapshot? payload)
  {
    return payload is null ? null : new CustomEventPayload(payload.ExtId, payload.ExtPayload);
  }
}