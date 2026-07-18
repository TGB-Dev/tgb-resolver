using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using NodaTime;
using NSubstitute;
using TGB.Resolver.Server.Commons.Data;
using TGB.Resolver.Server.Commons.Exceptions;
using TGB.Resolver.Server.Commons.Serialization;
using TGB.Resolver.Server.Features.Realtime;
using TGB.Resolver.Server.Features.Show;
using TGB.Resolver.Server.Features.Show.Data;
using TGB.Resolver.Server.Features.Show.Dto;

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

    var service = new ShowStateService(
      repository, serializer, hubContext, orchestrator, SystemClock.Instance);

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
    var service = await CreateServiceAsync();

    var snapshot = await service.SeekPlaybackAsync(new SeekPlaybackRequest(1, 3));

    await Assert.That(snapshot.Playback.CurrentEventId).IsEqualTo(3);
    await Assert.That(snapshot.Playback.CurrentResolveEventId).IsEqualTo(1);
  }

  [Test]
  public async Task RescheduleAdvance_DoesNothingWhenPlaybackIsNotRunning()
  {
    var service = await CreateServiceAsync();
    var before = await service.GetSnapshotAsync();

    await service.RescheduleAdvanceAsync();

    var after = await service.GetSnapshotAsync();
    await Assert.That(after.ShowVersion).IsEqualTo(before.ShowVersion);
    await Assert.That(after.Playback.Status).IsEqualTo(before.Playback.Status);
  }

  private static async Task<ShowStateService> CreateServiceAsync()
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
    var service = new ShowStateService(
      repository, serializer, hubContext, orchestrator, SystemClock.Instance);
    await service.EnsureSeededAsync();
    return service;
  }
}