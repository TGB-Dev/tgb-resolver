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
    var options = new DbContextOptionsBuilder<ResolverDbContext>()
      .UseSqlite("Data Source=:memory:")
      .Options;
    await using var dbContext = new ResolverDbContext(options);
    await dbContext.Database.OpenConnectionAsync();
    await dbContext.Database.EnsureCreatedAsync();

    var serializer = new AppJsonSerializer(AppJsonSerializerContext.Default);
    var repository = new ShowRawRepository(dbContext, serializer, SystemClock.Instance);
    var hubContext = Substitute.For<IHubContext<ShowHub, IShowHubClient>>();
    hubContext.Clients.Returns(Substitute.For<IHubClients<IShowHubClient>>());
    hubContext.Clients.All.Returns(Substitute.For<IShowHubClient>());
    var orchestrator = new TimelineOrchestrator(null!);
    var assetStore = CreateAssetStore();

    var service = new ShowStateService(
      repository, serializer, hubContext, orchestrator, SystemClock.Instance, assetStore);

    await service.EnsureSeededAsync();

    VersionDriftException? exception = null;

    try
    {
      await service.StartPlaybackAsync(new VersionedCommandRequest(999));
    }
    catch (VersionDriftException ex)
    {
      exception = ex;
    }

    await Assert.That(exception).IsNotNull();
    await Assert.That(exception!.ExpectedVersion).IsEqualTo(999);
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

  private static AssetStore CreateAssetStore(string? contentRootPath = null)
  {
    var environment = Substitute.For<IHostEnvironment>();
    environment.ContentRootPath.Returns(contentRootPath ?? Path.GetTempPath());
    return new AssetStore(environment);
  }
}