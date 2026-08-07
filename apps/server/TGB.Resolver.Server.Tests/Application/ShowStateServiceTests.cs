using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using NSubstitute;
using TGB.Resolver.Server.Commons.Data;
using TGB.Resolver.Server.Commons.Exceptions;
using TGB.Resolver.Server.Commons.Serialization;
using TGB.Resolver.Server.Commons.Types;
using TGB.Resolver.Server.Features.Assets;
using TGB.Resolver.Server.Features.Realtime;
using TGB.Resolver.Server.Features.Show;
using TGB.Resolver.Server.Features.Show.Data;
using TGB.Resolver.Server.Features.Show.Dto;
// ReSharper disable once RedundantUsingDirective
using NodaTime;

namespace TGB.Resolver.Server.Tests.Application;

public sealed class ShowStateServiceTests
{
  [Test]
  public async Task StartPlayback_RejectsStaleShowVersion()
  {
    var (service, _) = await CreateServiceAsync();

    var exception = (await Assert.That(async () =>
        await service.StartPlaybackAsync(new VersionedCommandRequest(999)))
      .Throws<VersionDriftException>())!;

    await Assert.That(exception.ExpectedVersion).IsEqualTo(999);
    await Assert.That(exception.ActualVersion).IsEqualTo(1);
  }

  [Test]
  public async Task PatchTimelineEvent_RejectsNonFiniteTriggerOffset()
  {
    var (service, _) = await CreateServiceAsync();

    await Assert.That(async () => await service.PatchTimelineEventAsync(1,
        new PatchTimelineEventRequest(1, null, false, null, double.NaN, false, null, null)))
      .Throws<ArgumentException>();
  }

  [Test]
  public async Task PatchTimelineEvent_RejectsNonFiniteDuration()
  {
    var (service, _) = await CreateServiceAsync();

    await Assert.That(async () => await service.PatchTimelineEventAsync(1,
        new PatchTimelineEventRequest(1, double.PositiveInfinity, false, null, null, false, null,
          null)))
      .Throws<ArgumentException>();
  }

  [Test]
  public async Task ScheduleNextAdvance_HoldsNextEventUntilCurrentDurationElapses()
  {
    var orchestrator = new RecordingOrchestrator();
    var (service, repository) = await CreateServiceWithOrchestratorAsync(orchestrator);

    // Current event lasts 5s; next event has no trigger offset (sequential).
    var show = ShowRawRepository.CreateEmptyShow(1, ShowSource.Manual) with
    {
      Automation = new AutomationState(true, 3_000, false),
      Playback = new PlaybackState(PlaybackStatus.Running, 1, [1], 0),
      Timeline =
      [
        new TimelineEvent(1, 1, TimelineEventType.Cus, 5, null, false, "E1", null, null, null),
        new TimelineEvent(2, 2, TimelineEventType.Cus, null, null, false, "E2", null, null, null)
      ]
    };
    await repository.ReplaceAsync(show);

    await service.RescheduleAdvanceAsync();

    await Assert.That(orchestrator.Delays).Contains(5_000);
  }

  [Test]
  public async Task ScheduleNextAdvance_ZeroTriggerOffset_SchedulesZeroDelay()
  {
    var orchestrator = new RecordingOrchestrator();
    var (service, repository) = await CreateServiceWithOrchestratorAsync(orchestrator);

    var show = ShowRawRepository.CreateEmptyShow(1, ShowSource.Manual) with
    {
      Automation = new AutomationState(true, 3_000, false),
      Playback = new PlaybackState(PlaybackStatus.Running, 1, [1], 0),
      Timeline =
      [
        new TimelineEvent(1, 1, TimelineEventType.Cus, null, null, false, "E1", null, null, null),
        new TimelineEvent(2, 2, TimelineEventType.Cus, null, 0, false, "E2", null, null, null)
      ]
    };
    await repository.ReplaceAsync(show);

    await service.RescheduleAdvanceAsync();

    await Assert.That(orchestrator.Delays).Contains(0);
  }

  [Test]
  public async Task ScheduleNextAdvance_NegativeTriggerOffset_PassesClampedZeroDelay()
  {
    var orchestrator = new RecordingOrchestrator();
    var (service, repository) = await CreateServiceWithOrchestratorAsync(orchestrator);

    var show = ShowRawRepository.CreateEmptyShow(1, ShowSource.Manual) with
    {
      Automation = new AutomationState(true, 3_000, false),
      Playback = new PlaybackState(PlaybackStatus.Running, 1, [1], 0),
      Timeline =
      [
        new TimelineEvent(1, 1, TimelineEventType.Cus, null, null, false, "E1", null, null, null),
        new TimelineEvent(2, 2, TimelineEventType.Cus, null, -2.5, false, "E2", null, null,
          null)
      ]
    };
    await repository.ReplaceAsync(show);

    await service.RescheduleAdvanceAsync();

    await Assert.That(orchestrator.Delays).Contains(0);
  }

  [Test]
  public async Task ScheduleNextAdvance_TriggerOffset_SchedulesDelayEvenWhenAutoModesDisabled()
  {
    var orchestrator = new RecordingOrchestrator();
    var (service, repository) = await CreateServiceWithOrchestratorAsync(orchestrator);

    var show = ShowRawRepository.CreateEmptyShow(1, ShowSource.Manual) with
    {
      Automation = new AutomationState(false, 3_000, false),
      Playback = new PlaybackState(PlaybackStatus.Running, 1, [1], 0),
      Timeline =
      [
        new TimelineEvent(1, 1, TimelineEventType.Cus, 5, null, false, "E1", null, null, null),
        new TimelineEvent(2, 2, TimelineEventType.Cus, null, 0.5, false, "E2", null, null, null)
      ]
    };
    await repository.ReplaceAsync(show);

    await service.RescheduleAdvanceAsync();

    await Assert.That(orchestrator.Delays).Contains(500);
  }

  [Test]
  public async Task StartPlayback_ActiveEventIdsIncludesConcurrentTriggerOffsetChildren()
  {
    var orchestrator = new RecordingOrchestrator();
    var (service, repository) = await CreateServiceWithOrchestratorAsync(orchestrator);

    var show = ShowRawRepository.CreateEmptyShow(1, ShowSource.Manual) with
    {
      Automation = new AutomationState(true, 3_000, false),
      Timeline =
      [
        new TimelineEvent(1, 1, TimelineEventType.Cus, null, null, false, "E1", null, null, null),
        new TimelineEvent(2, 2, TimelineEventType.Cus, null, 2, false, "E2", null, null, null),
        new TimelineEvent(3, 3, TimelineEventType.Cus, null, 3, false, "E3", null, null, null),
        new TimelineEvent(4, 4, TimelineEventType.Cus, null, null, false, "E4", null, null, null)
      ]
    };
    await repository.ReplaceAsync(show);

    var snapshot = await service.StartPlaybackAsync(new VersionedCommandRequest(1));

    await Assert.That(snapshot.Playback.CurrentEventId).IsEqualTo(1);
    await Assert.That(snapshot.Playback.ActiveEventIds).IsEquivalentTo([1]);
  }

  [Test]
  public async Task SeekPlayback_MovesTheCurrentEventToTheRequestedTimelineEvent()
  {
    var (service, _) = await CreateServiceAsync();

    var snapshot = await service.SeekPlaybackAsync(new SeekPlaybackRequest(1, 3));

    await Assert.That(snapshot.Playback.CurrentEventId).IsEqualTo(3);
    await Assert.That(snapshot.Playback.ActiveEventIds).IsEquivalentTo([3]);
  }

  [Test]
  public async Task RescheduleAdvance_DoesNothingWhenPlaybackIsNotRunning()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();

    await service.RescheduleAdvanceAsync();

    var after = await service.GetSnapshotAsync();
    await Assert.That(after.ShowVersion).IsEqualTo(before.ShowVersion);
    await Assert.That(after.Playback.Status).IsEqualTo(before.Playback.Status);
  }

  [Test]
  public async Task StartPlayback_BroadcastsPlaybackStateChangedWithoutBumpingShowVersion()
  {
    var (service, hub) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();

    await service.StartPlaybackAsync(new VersionedCommandRequest(before.ShowVersion));

    await hub.Clients.All.Received(1).PlaybackStateChanged(Arg.Any<PlaybackStateChangedMessage>());
    await hub.Clients.All.DidNotReceive().ShowReplaced(Arg.Any<ShowReplacedMessage>());
    var after = await service.GetSnapshotAsync();
    await Assert.That(after.ShowVersion).IsEqualTo(before.ShowVersion);
  }

  [Test]
  public async Task NonPlaybackShowMutations_IncrementShowVersion()
  {
    var (service, hub) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();

    var timelineMode = await service.SetTimelineModeAsync(
      new SetTimelineModeRequest(before.ShowVersion, TimelineMode.Ro));
    await Assert.That(timelineMode.ShowVersion).IsEqualTo(before.ShowVersion + 1);

    var automation = await service.SetAutomationAsync(
      new SetAutomationRequest(timelineMode.ShowVersion, null, null, true));
    await Assert.That(automation.ShowVersion).IsEqualTo(timelineMode.ShowVersion + 1);

    var live = await service.SetLiveModeAsync(true);
    await Assert.That(live.ShowVersion).IsEqualTo(automation.ShowVersion + 1);
    await hub.Clients.All.Received(2).ShowReplaced(Arg.Any<ShowReplacedMessage>());
    await hub.Clients.All.Received(1).LiveModeChanged(Arg.Any<LiveModeChangedMessage>());
  }

  [Test]
  public async Task CreateFolder_AddsRootFolder()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();

    var snapshot = await service.CreateFolderAsync(
      new CreateFolderRequest(before.ShowVersion, string.Empty, "My Folder"));

    await Assert.That(snapshot.Assets.Folders).HasSingleItem();
    await Assert.That(snapshot.Assets.Folders[0].Name).IsEqualTo("My Folder");
  }

  [Test]
  public async Task CreateFolder_AddsNestedFolder()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();
    var root = await service.CreateFolderAsync(
      new CreateFolderRequest(before.ShowVersion, string.Empty, "Root"));

    var snapshot = await service.CreateFolderAsync(
      new CreateFolderRequest(root.ShowVersion, root.Assets.Folders[0].Id, "Child"));

    await Assert.That(snapshot.Assets.Folders).HasSingleItem();
    await Assert.That(snapshot.Assets.Folders[0].Children).HasSingleItem();
    await Assert.That(snapshot.Assets.Folders[0].Children[0].Name).IsEqualTo("Child");
  }

  [Test]
  public async Task RenameFolder_UpdatesName()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();
    var created = await service.CreateFolderAsync(
      new CreateFolderRequest(before.ShowVersion, string.Empty, "Old Name"));

    var snapshot = await service.RenameEntryAsync(
      new RenameEntryRequest(created.ShowVersion, created.Assets.Folders[0].Id, true, "New Name"));

    await Assert.That(snapshot.Assets.Folders[0].Name).IsEqualTo("New Name");
  }

  [Test]
  public async Task RenameFolder_UpdatesNestedSubfolderName()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();
    var root = await service.CreateFolderAsync(
      new CreateFolderRequest(before.ShowVersion, string.Empty, "Root"));
    var child = await service.CreateFolderAsync(
      new CreateFolderRequest(root.ShowVersion, root.Assets.Folders[0].Id, "Old Subfolder"));

    var subfolderId = child.Assets.Folders[0].Children[0].Id;
    var snapshot = await service.RenameEntryAsync(
      new RenameEntryRequest(child.ShowVersion, subfolderId, true, "New Subfolder Name"));

    await Assert.That(snapshot.Assets.Folders[0].Children[0].Name).IsEqualTo("New Subfolder Name");
  }

  [Test]
  public async Task DeleteFolder_RemovesLeafFolder()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();
    var created = await service.CreateFolderAsync(
      new CreateFolderRequest(before.ShowVersion, string.Empty, "To Delete"));

    var snapshot = await service.DeleteEntryAsync(
      new DeleteEntryRequest(created.ShowVersion, created.Assets.Folders[0].Id, true));

    await Assert.That(snapshot.Assets.Folders).IsEmpty();
  }

  [Test]
  public async Task DeleteFolder_ClearsFolderIdOnAssets()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();
    var created = await service.CreateFolderAsync(
      new CreateFolderRequest(before.ShowVersion, string.Empty, "Folder"));

    var assetId = "asset-1";
    var bytes = Convert.ToBase64String([0x01, 0x02, 0x03]);
    var withAsset = await service.UpsertAssetAsync(assetId,
      new UpsertAssetRequest(created.ShowVersion, "test.png", "image/png", bytes)
      {
        FolderId = created.Assets.Folders[0].Id
      });

    var snapshot = await service.DeleteEntryAsync(
      new DeleteEntryRequest(withAsset.ShowVersion, created.Assets.Folders[0].Id, true));

    await Assert.That(snapshot.Assets.Folders).IsEmpty();
    await Assert.That(snapshot.Assets.Items).HasSingleItem();
    await Assert.That(snapshot.Assets.Items[0].FolderId).IsNull();
  }

  [Test]
  public async Task MoveAsset_ChangesFolderId()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();
    var folder = await service.CreateFolderAsync(
      new CreateFolderRequest(before.ShowVersion, string.Empty, "Target"));

    var assetId = "asset-1";
    var bytes = Convert.ToBase64String([0x01, 0x02, 0x03]);
    var withAsset = await service.UpsertAssetAsync(assetId,
      new UpsertAssetRequest(folder.ShowVersion, "test.png", "image/png", bytes));

    var snapshot = await service.MoveAssetAsync(
      new MoveAssetRequest(withAsset.ShowVersion, assetId, folder.Assets.Folders[0].Id));

    await Assert.That(snapshot.Assets.Items[0].FolderId).IsEqualTo(folder.Assets.Folders[0].Id);
  }

  [Test]
  public async Task MoveAsset_ClearsFolderId_WhenTargetIsEmpty()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();
    var folder = await service.CreateFolderAsync(
      new CreateFolderRequest(before.ShowVersion, string.Empty, "Folder"));

    var assetId = "asset-1";
    var bytes = Convert.ToBase64String([0x01, 0x02, 0x03]);
    var withAsset = await service.UpsertAssetAsync(assetId,
      new UpsertAssetRequest(folder.ShowVersion, "test.png", "image/png", bytes)
      {
        FolderId = folder.Assets.Folders[0].Id
      });

    // Move to root (empty TargetFolderId means root via the request model)
    var snapshot = await service.MoveAssetAsync(
      new MoveAssetRequest(withAsset.ShowVersion, assetId, string.Empty));

    await Assert.That(snapshot.Assets.Items[0].FolderId).IsEqualTo(string.Empty);
  }

  [Test]
  public async Task TransferEntry_CopyAsset_CreatesNewAssetInTargetFolder()
  {
    var assetStore = CreateAssetStore();
    var (service, _) = await CreateServiceAsync(assetStore);
    var before = await service.GetSnapshotAsync();
    var folder = await service.CreateFolderAsync(
      new CreateFolderRequest(before.ShowVersion, string.Empty, "Target"));

    var assetId = "asset-1";
    var bytes = Convert.ToBase64String([0x01, 0x02, 0x03]);
    await assetStore.SaveAsync(assetId, Convert.FromBase64String(bytes));
    var withAsset = await service.UpsertAssetAsync(assetId,
      new UpsertAssetRequest(folder.ShowVersion, "test.png", "image/png", bytes));

    var snapshot = await service.TransferEntryAsync(
      new TransferEntryRequest(
        withAsset.ShowVersion,
        assetId,
        false,
        folder.Assets.Folders[0].Id,
        true));

    await Assert.That(snapshot.Assets.Items).Count().IsEqualTo(2);
    var copy = snapshot.Assets.Items.Single(item => item.Id != assetId);
    await Assert.That(copy.FolderId).IsEqualTo(folder.Assets.Folders[0].Id);
  }

  [Test]
  public async Task TransferEntry_MoveFolder_ReparentsFolder()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();
    var root = await service.CreateFolderAsync(
      new CreateFolderRequest(before.ShowVersion, string.Empty, "Root"));
    var child = await service.CreateFolderAsync(
      new CreateFolderRequest(root.ShowVersion, root.Assets.Folders[0].Id, "Child"));
    var destination = await service.CreateFolderAsync(
      new CreateFolderRequest(child.ShowVersion, string.Empty, "Destination"));

    var childId = child.Assets.Folders[0].Children[0].Id;
    var destinationId = destination.Assets.Folders.First(f => f.Name == "Destination").Id;

    var snapshot = await service.TransferEntryAsync(
      new TransferEntryRequest(destination.ShowVersion, childId, true, destinationId, false));

    var rootFolder = snapshot.Assets.Folders.First(f => f.Name == "Root");
    await Assert.That(rootFolder.Children).IsEmpty();
    var destinationFolder = snapshot.Assets.Folders.First(f => f.Name == "Destination");
    await Assert.That(destinationFolder.Children.Any(f => f.Name == "Child")).IsTrue();
  }

  [Test]
  public async Task TransferEntry_RejectsMissingTargetFolder_WithoutChangingSnapshot()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();
    var folder = await service.CreateFolderAsync(
      new CreateFolderRequest(before.ShowVersion, string.Empty, "Source"));
    var snapshotBeforeTransfer = await service.GetSnapshotAsync();

    await Assert.That(async () => await service.TransferEntryAsync(
        new TransferEntryRequest(snapshotBeforeTransfer.ShowVersion, folder.Assets.Folders[0].Id,
          true,
          "missing-folder", false)))
      .Throws<InvalidOperationException>();

    var after = await service.GetSnapshotAsync();
    await AssertSnapshotUnchangedAsync(after, snapshotBeforeTransfer);
  }

  [Test]
  public async Task TransferEntry_RejectsFolderTransferIntoDescendant_WithoutChangingSnapshot()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();
    var root = await service.CreateFolderAsync(
      new CreateFolderRequest(before.ShowVersion, string.Empty, "Root"));
    var child = await service.CreateFolderAsync(
      new CreateFolderRequest(root.ShowVersion, root.Assets.Folders[0].Id, "Child"));
    var snapshotBeforeTransfer = await service.GetSnapshotAsync();

    await Assert.That(async () => await service.TransferEntryAsync(
        new TransferEntryRequest(snapshotBeforeTransfer.ShowVersion, root.Assets.Folders[0].Id,
          true,
          child.Assets.Folders[0].Children[0].Id, false)))
      .Throws<InvalidOperationException>();

    var after = await service.GetSnapshotAsync();
    await AssertSnapshotUnchangedAsync(after, snapshotBeforeTransfer);
  }

  [Test]
  public async Task TransferEntry_RejectsNoOpFolderMove_WithoutChangingSnapshot()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();
    var folder = await service.CreateFolderAsync(
      new CreateFolderRequest(before.ShowVersion, string.Empty, "Source"));
    var snapshotBeforeTransfer = await service.GetSnapshotAsync();

    await Assert.That(async () => await service.TransferEntryAsync(
        new TransferEntryRequest(snapshotBeforeTransfer.ShowVersion, folder.Assets.Folders[0].Id,
          true,
          string.Empty, false)))
      .Throws<InvalidOperationException>();

    var after = await service.GetSnapshotAsync();
    await AssertSnapshotUnchangedAsync(after, snapshotBeforeTransfer);
  }

  [Test]
  public async Task MoveAsset_NormalizesWhitespaceTargetFolderToRoot()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();
    var folder = await service.CreateFolderAsync(
      new CreateFolderRequest(before.ShowVersion, string.Empty, "Folder"));
    var withAsset = await service.UpsertAssetAsync("asset-1",
      new UpsertAssetRequest(folder.ShowVersion, "test.png", "image/png",
        Convert.ToBase64String([0x01]))
      {
        FolderId = folder.Assets.Folders[0].Id
      });

    var snapshot = await service.MoveAssetAsync(
      new MoveAssetRequest(withAsset.ShowVersion, "asset-1", "   "));

    await Assert.That(snapshot.Assets.Items[0].FolderId).IsEqualTo(string.Empty);
  }

  [Test]
  public async Task TransferEntry_CopyNestedFolder_CopiesChildrenAndAssets()
  {
    var assetStore = CreateAssetStore();
    var (service, _) = await CreateServiceAsync(assetStore);
    var before = await service.GetSnapshotAsync();
    var source = await service.CreateFolderAsync(
      new CreateFolderRequest(before.ShowVersion, string.Empty, "Source"));
    var nested = await service.CreateFolderAsync(
      new CreateFolderRequest(source.ShowVersion, source.Assets.Folders[0].Id, "Nested"));
    var destination = await service.CreateFolderAsync(
      new CreateFolderRequest(nested.ShowVersion, string.Empty, "Destination"));
    await assetStore.SaveAsync("asset-1", [0x01]);
    var withAsset = await service.UpsertAssetAsync("asset-1",
      new UpsertAssetRequest(destination.ShowVersion, "test.png", "image/png",
        Convert.ToBase64String([0x01]))
      {
        FolderId = nested.Assets.Folders[0].Children[0].Id
      });

    var snapshot = await service.TransferEntryAsync(
      new TransferEntryRequest(withAsset.ShowVersion, source.Assets.Folders[0].Id, true,
        destination.Assets.Folders.Single(folder => folder.Name == "Destination").Id, true));

    var copiedSource = snapshot.Assets.Folders.Single(folder => folder.Name == "Destination")
      .Children
      .Single(folder => folder.Name == "Source");
    var copiedNested = copiedSource.Children.Single();
    var copiedAsset = snapshot.Assets.Items.Single(asset => asset.Id != "asset-1");
    await Assert.That(copiedSource.Id).IsNotEqualTo(source.Assets.Folders[0].Id);
    await Assert.That(copiedNested.Id).IsNotEqualTo(nested.Assets.Folders[0].Children[0].Id);
    await Assert.That(copiedAsset.Id).IsNotEqualTo("asset-1");
    await Assert.That(copiedAsset.FolderId).IsEqualTo(copiedNested.Id);
    await Assert.That(await assetStore.ReadAsync(copiedAsset.Id))
      .IsEquivalentTo(new byte[] { 0x01 });
  }

  [Test]
  public async Task TransferEntry_RejectsFolderCopyIntoSelf_WithoutChangingSnapshot()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();
    var source = await service.CreateFolderAsync(
      new CreateFolderRequest(before.ShowVersion, string.Empty, "Source"));
    var snapshotBeforeCopy = await service.GetSnapshotAsync();

    await Assert.That(async () => await service.TransferEntryAsync(
        new TransferEntryRequest(snapshotBeforeCopy.ShowVersion, source.Assets.Folders[0].Id, true,
          source.Assets.Folders[0].Id, true)))
      .Throws<InvalidOperationException>();

    await AssertSnapshotUnchangedAsync(await service.GetSnapshotAsync(), snapshotBeforeCopy);
  }

  [Test]
  public async Task TransferEntry_RejectsFolderCopyIntoDescendant_WithoutChangingSnapshot()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();
    var source = await service.CreateFolderAsync(
      new CreateFolderRequest(before.ShowVersion, string.Empty, "Source"));
    var nested = await service.CreateFolderAsync(
      new CreateFolderRequest(source.ShowVersion, source.Assets.Folders[0].Id, "Nested"));
    var snapshotBeforeCopy = await service.GetSnapshotAsync();

    await Assert.That(async () => await service.TransferEntryAsync(
        new TransferEntryRequest(snapshotBeforeCopy.ShowVersion, source.Assets.Folders[0].Id, true,
          nested.Assets.Folders[0].Children[0].Id, true)))
      .Throws<InvalidOperationException>();

    await AssertSnapshotUnchangedAsync(await service.GetSnapshotAsync(), snapshotBeforeCopy);
  }

  [Test]
  public async Task TransferEntry_RejectsFolderCopyToMissingTarget_WithoutChangingSnapshot()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();
    var source = await service.CreateFolderAsync(
      new CreateFolderRequest(before.ShowVersion, string.Empty, "Source"));
    var snapshotBeforeCopy = await service.GetSnapshotAsync();

    await Assert.That(async () => await service.TransferEntryAsync(
        new TransferEntryRequest(snapshotBeforeCopy.ShowVersion, source.Assets.Folders[0].Id, true,
          "missing-folder", true)))
      .Throws<InvalidOperationException>();

    await AssertSnapshotUnchangedAsync(await service.GetSnapshotAsync(), snapshotBeforeCopy);
  }

  [Test]
  public async Task TransferEntry_StaleAssetCopy_RollsBackCopiedFile()
  {
    var contentRoot = Path.Combine(Path.GetTempPath(), $"tgb-resolver-{Guid.NewGuid():N}");
    Directory.CreateDirectory(contentRoot);
    try
    {
      var assetStore = CreateAssetStore(contentRoot);
      var (service, _) = await CreateServiceAsync(assetStore);
      await assetStore.SaveAsync("asset-1", [0x01]);
      var before = await service.GetSnapshotAsync();
      var withAsset = await service.UpsertAssetAsync("asset-1",
        new UpsertAssetRequest(before.ShowVersion, "test.png", "image/png",
          Convert.ToBase64String([0x01])));

      await Assert.That(async () => await service.TransferEntryAsync(
          new TransferEntryRequest(withAsset.ShowVersion - 1, "asset-1", false, string.Empty,
            true)))
        .Throws<VersionDriftException>();

      var storedFiles = Directory.GetFiles(Path.Combine(contentRoot, ".data", "assets"));
      await Assert.That(storedFiles.Select(path => Path.GetFileName(path)))
        .IsEquivalentTo(["asset-1"]);
    }
    finally
    {
      Directory.Delete(contentRoot, true);
    }
  }

  [Test]
  public async Task TransferEntry_StaleFolderCopy_RollsBackCopiedFiles()
  {
    var contentRoot = Path.Combine(Path.GetTempPath(), $"tgb-resolver-{Guid.NewGuid():N}");
    Directory.CreateDirectory(contentRoot);
    try
    {
      var assetStore = CreateAssetStore(contentRoot);
      var (service, _) = await CreateServiceAsync(assetStore);
      var before = await service.GetSnapshotAsync();
      var source = await service.CreateFolderAsync(
        new CreateFolderRequest(before.ShowVersion, string.Empty, "Source"));
      await assetStore.SaveAsync("asset-1", [0x01]);
      var withAsset = await service.UpsertAssetAsync("asset-1",
        new UpsertAssetRequest(source.ShowVersion, "test.png", "image/png",
          Convert.ToBase64String([0x01]))
        {
          FolderId = source.Assets.Folders[0].Id
        });

      await Assert.That(async () => await service.TransferEntryAsync(
          new TransferEntryRequest(withAsset.ShowVersion - 1, source.Assets.Folders[0].Id, true,
            string.Empty, true)))
        .Throws<VersionDriftException>();

      var storedFiles = Directory.GetFiles(Path.Combine(contentRoot, ".data", "assets"));
      await Assert.That(storedFiles.Select(path => Path.GetFileName(path)))
        .IsEquivalentTo(["asset-1"]);
    }
    finally
    {
      Directory.Delete(contentRoot, true);
    }
  }

  [Test]
  public async Task Optimize_KeepsResolveAndPayloadEvents_ReindexesPositions()
  {
    var (service, hub) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();
    var created = await service.CreateNonResolveEventAsync(new CreateTimelineEventRequest(
      before.ShowVersion, 2, false, 5, 0.5, false, "Payloadless", null));

    var snapshot = await service.OptimizeAsync(
      new VersionedCommandRequest(created.ShowVersion));

    // The payload-less custom event is dropped; resolve/pre-resolve and
    // payload-bearing events survive and are reindexed from 1.
    await Assert.That(snapshot.Timeline).Count().IsEqualTo(4);
    await Assert.That(snapshot.Timeline.Select(e => e.Position)).IsEquivalentTo([1, 2, 3, 4]);
    await Assert.That(snapshot.Timeline.Any(e => e.CustomName == "Payloadless")).IsFalse();
    await hub.Clients.All.Received(1).TimelineReordered(Arg.Any<TimelineReorderedMessage>());
  }

  [Test]
  public async Task Clear_ResetsShowToEmptyManualState()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();

    var snapshot = await service.ClearAsync(new VersionedCommandRequest(before.ShowVersion));

    await Assert.That(snapshot.Timeline).IsEmpty();
    await Assert.That(snapshot.Meta.Title).IsEqualTo("Untitled show");
    await Assert.That(snapshot.Meta.Source).IsEqualTo(ShowSource.Manual);
    await Assert.That(snapshot.ShowVersion).IsEqualTo(before.ShowVersion + 1);
  }

  [Test]
  public async Task ImportXml_ReplacesShowWithParsedContest()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();
    var xml = await ReadSampleXmlAsync();

    var snapshot = await service.ImportXmlAsync(new ImportXmlRequest(xml, null));

    await Assert.That(snapshot.ShowVersion).IsEqualTo(before.ShowVersion + 1);
    await Assert.That(snapshot.Meta.Title).IsEqualTo("Contest");
    await Assert.That(snapshot.Meta.Source).IsEqualTo(ShowSource.Xml);
    await Assert.That(snapshot.Contest.Users).Count().IsEqualTo(54);
    await Assert.That(snapshot.Timeline).Count().IsEqualTo(78);
  }

  [Test]
  public async Task ImportXml_RejectsReadOnlyTimeline()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();
    await service.SetTimelineModeAsync(new SetTimelineModeRequest(before.ShowVersion,
      TimelineMode.Ro));
    var xml = await ReadSampleXmlAsync();

    await Assert.That(async () => await service.ImportXmlAsync(new ImportXmlRequest(xml, null)))
      .Throws<InvalidOperationException>();
  }

  [Test]
  public async Task CreateNonResolveEvent_InsertsCustomEventAtPosition()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();

    var snapshot = await service.CreateNonResolveEventAsync(new CreateTimelineEventRequest(
      before.ShowVersion, 2, true, 7, 1.5, false, "Inserted", null));

    await Assert.That(snapshot.Timeline).Count().IsEqualTo(5);
    var inserted = snapshot.Timeline[1];
    await Assert.That(inserted.CustomName).IsEqualTo("Inserted");
    await Assert.That(inserted.Position).IsEqualTo(2);
    await Assert.That(snapshot.Timeline[2].Id).IsEqualTo(2);
  }

  [Test]
  public async Task PatchTimelineEvent_UpdatesCustomEventFields()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();

    var snapshot = await service.PatchTimelineEventAsync(4,
      new PatchTimelineEventRequest(
        before.ShowVersion, 7, false, "Renamed", 1.5, false, true, null));

    var updated = snapshot.Timeline.Single(e => e.Id == 4);
    await Assert.That(updated.DurationSeconds).IsEqualTo(7);
    await Assert.That(updated.CustomName).IsEqualTo("Renamed");
    await Assert.That(updated.TriggerOffsetSeconds).IsEqualTo(1.5);
    await Assert.That(updated.RequireManualInteraction).IsTrue();
  }

  [Test]
  public async Task MoveNonResolveEvent_ReordersCustomEvent()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();

    var snapshot = await service.MoveNonResolveEventAsync(4,
      new MoveTimelineEventRequest(before.ShowVersion, 2, true));

    await Assert.That(snapshot.Timeline.Select(e => e.Id)).IsEquivalentTo(new[] { 1, 4, 2, 3 });
  }

  [Test]
  public async Task MoveNonResolveEvent_RejectsResolveEvent()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();

    await Assert.That(async () => await service.MoveNonResolveEventAsync(1,
        new MoveTimelineEventRequest(before.ShowVersion, 2, true)))
      .Throws<InvalidOperationException>();
  }

  [Test]
  public async Task DeleteNonResolveEvent_RemovesEventAndRenumbers()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();

    var snapshot = await service.DeleteNonResolveEventAsync(4,
      new VersionedCommandRequest(before.ShowVersion));

    await Assert.That(snapshot.Timeline).Count().IsEqualTo(3);
    await Assert.That(snapshot.Timeline.Select(e => e.Position)).IsEquivalentTo(new[] { 1, 2, 3 });
  }

  [Test]
  public async Task DeleteNonResolveEvent_RejectsResolveEvent()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();

    await Assert.That(async () => await service.DeleteNonResolveEventAsync(1,
        new VersionedCommandRequest(before.ShowVersion)))
      .Throws<InvalidOperationException>();
  }

  [Test]
  public async Task AdvancePlaybackAsync_WhenRunning_MovesToTheNextEvent()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();
    var started = await service.StartPlaybackAsync(new VersionedCommandRequest(before.ShowVersion));
    await Assert.That(started.Playback.CurrentEventId).IsEqualTo(1);

    await service.AdvancePlaybackAsync(CancellationToken.None);

    var after = await service.GetSnapshotAsync();
    await Assert.That(after.Playback.CurrentEventId).IsEqualTo(2);
    await Assert.That(after.Playback.ActiveEventIds).IsEquivalentTo([1, 2]);
  }

  [Test]
  public async Task AdvancePlaybackAsync_WhenIdle_DoesNothing()
  {
    var (service, _) = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();

    await service.AdvancePlaybackAsync(CancellationToken.None);

    var after = await service.GetSnapshotAsync();
    await Assert.That(after.ShowVersion).IsEqualTo(before.ShowVersion);
    await Assert.That(after.Playback.Status).IsEqualTo(PlaybackStatus.Idle);
  }

  private static async Task<string> ReadSampleXmlAsync()
  {
    return await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "Fixtures",
      "sample.xml"));
  }

  private static async Task AssertSnapshotUnchangedAsync(ShowStateSnapshot actual,
    ShowStateSnapshot expected)
  {
    await Assert.That(actual.ShowVersion).IsEqualTo(expected.ShowVersion);
    await Assert.That(actual.Assets.Items).IsEquivalentTo(expected.Assets.Items);
    await Assert.That(actual.Assets.Folders).IsEquivalentTo(expected.Assets.Folders);
  }

  private static async Task<(ShowStateService Service, IHubContext<ShowHub, IShowHubClient> Hub)>
    CreateServiceAsync(AssetStore? assetStore = null)
  {
    var options = new DbContextOptionsBuilder<ResolverDbContext>()
      .UseSqlite("Data Source=:memory:")
      .Options;
    var dbContext = new ResolverDbContext(options);
    await dbContext.Database.OpenConnectionAsync();
    await dbContext.Database.EnsureCreatedAsync();
    var serializer = new AppJsonSerializer(AppJsonSerializerContext.Default);
    var repository = new ShowRawRepository(dbContext, serializer, SystemClock.Instance);
    var hubContext = Substitute.For<IHubContext<ShowHub, IShowHubClient>>();
    hubContext.Clients.Returns(Substitute.For<IHubClients<IShowHubClient>>());
    hubContext.Clients.All.Returns(Substitute.For<IShowHubClient>());
    var orchestrator = new TimelineOrchestrator(null!);
    assetStore ??= CreateAssetStore();
    var service = new ShowStateService(
      repository, serializer, hubContext, orchestrator, SystemClock.Instance, assetStore);
    await service.EnsureSeededAsync();
    return (service, hubContext);
  }

  private static async Task<(ShowStateService Service, ShowRawRepository Repository)>
    CreateServiceWithOrchestratorAsync(TimelineOrchestrator orchestrator)
  {
    var options = new DbContextOptionsBuilder<ResolverDbContext>()
      .UseSqlite("Data Source=:memory:")
      .Options;
    var dbContext = new ResolverDbContext(options);
    await dbContext.Database.OpenConnectionAsync();
    await dbContext.Database.EnsureCreatedAsync();
    var serializer = new AppJsonSerializer(AppJsonSerializerContext.Default);
    var repository = new ShowRawRepository(dbContext, serializer, SystemClock.Instance);
    var hubContext = Substitute.For<IHubContext<ShowHub, IShowHubClient>>();
    hubContext.Clients.Returns(Substitute.For<IHubClients<IShowHubClient>>());
    hubContext.Clients.All.Returns(Substitute.For<IShowHubClient>());
    var service = new ShowStateService(
      repository, serializer, hubContext, orchestrator, SystemClock.Instance, CreateAssetStore());
    await service.EnsureSeededAsync();
    return (service, repository);
  }

  private static AssetStore CreateAssetStore(string? contentRootPath = null)
  {
    var environment = Substitute.For<IHostEnvironment>();
    environment.ContentRootPath.Returns(contentRootPath
                                        ?? Path.Combine(Path.GetTempPath(),
                                          $"tgb-resolver-{Guid.NewGuid():N}"));
    return new AssetStore(environment);
  }

  private sealed class RecordingOrchestrator : TimelineOrchestrator
  {
    public RecordingOrchestrator()
      : base(null!)
    {
    }

    public List<long> Delays { get; } = [];

    public override void ScheduleAdvance(long delayMs)
    {
      Delays.Add(delayMs);
    }

    public override void CancelAdvance()
    {
    }
  }
}