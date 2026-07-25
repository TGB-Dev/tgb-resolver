using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using NSubstitute;
using TGB.Resolver.Server.Commons.Data;
using TGB.Resolver.Server.Commons.Exceptions;
using TGB.Resolver.Server.Commons.Serialization;
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

  private static async Task<(ShowStateService Service, IHubContext<ShowHub, IShowHubClient> Hub)>
    CreateServiceAsync()
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
    var assetStore = CreateAssetStore();
    var service = new ShowStateService(
      repository, serializer, hubContext, orchestrator, SystemClock.Instance, assetStore);
    await service.EnsureSeededAsync();
    return (service, hubContext);
  }

  private static AssetStore CreateAssetStore()
  {
    var environment = Substitute.For<IHostEnvironment>();
    environment.ContentRootPath.Returns(Path.GetTempPath());
    return new AssetStore(environment);
  }
}