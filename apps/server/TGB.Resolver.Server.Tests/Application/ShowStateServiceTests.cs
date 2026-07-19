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
        await Assert.That(snapshot.Playback.CurrentResolveEventId).IsEqualTo(1);
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