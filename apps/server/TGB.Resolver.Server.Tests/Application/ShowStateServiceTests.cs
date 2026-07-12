using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
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
    var repository = new ShowRawRepository(dbContext, serializer, TimeProvider.System);
    var service = new ShowStateService(
      repository,
      serializer,
      new StubHubContext(),
      TimeProvider.System);

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

  private static async Task<ShowStateService> CreateServiceAsync()
  {
    var options = new DbContextOptionsBuilder<ResolverDbContext>()
      .UseSqlite("Data Source=:memory:")
      .Options;
    var dbContext = new ResolverDbContext(options);
    await dbContext.Database.OpenConnectionAsync();
    await dbContext.Database.EnsureCreatedAsync();
    var serializer = new AppJsonSerializer(AppJsonSerializerContext.Default);
    var repository = new ShowRawRepository(dbContext, serializer, TimeProvider.System);
    var service = new ShowStateService(
      repository,
      serializer,
      new StubHubContext(),
      TimeProvider.System);
    await service.EnsureSeededAsync();
    return service;
  }

  private sealed class StubHubContext : IHubContext<ShowHub, IShowHubClient>
  {
    public IHubClients<IShowHubClient> Clients { get; } = new StubHubClients();

    public IGroupManager Groups { get; } = new StubGroupManager();
  }

  private sealed class StubHubClients : IHubClients<IShowHubClient>
  {
    public IShowHubClient All { get; } = new StubShowHubClient();

    public IShowHubClient AllExcept(IReadOnlyList<string> excludedConnectionIds)
    {
      return All;
    }

    public IShowHubClient Client(string connectionId)
    {
      return All;
    }

    public IShowHubClient Clients(IReadOnlyList<string> connectionIds)
    {
      return All;
    }

    public IShowHubClient Group(string groupName)
    {
      return All;
    }

    public IShowHubClient GroupExcept(string groupName, IReadOnlyList<string> excludedConnectionIds)
    {
      return All;
    }

    public IShowHubClient Groups(IReadOnlyList<string> groupNames)
    {
      return All;
    }

    public IShowHubClient User(string userId)
    {
      return All;
    }

    public IShowHubClient Users(IReadOnlyList<string> userIds)
    {
      return All;
    }
  }

  private sealed class StubShowHubClient : IShowHubClient
  {
    public Task LiveModeChanged(LiveModeChangedMessage message)
    {
      return Task.CompletedTask;
    }

    public Task PlaybackStateChanged(PlaybackStateChangedMessage message)
    {
      return Task.CompletedTask;
    }

    public Task ShowRefetchRequired(ShowRefetchRequiredMessage message)
    {
      return Task.CompletedTask;
    }
  }

  private sealed class StubGroupManager : IGroupManager
  {
    public Task AddToGroupAsync(string connectionId, string groupName,
      CancellationToken cancellationToken = default)
    {
      return Task.CompletedTask;
    }

    public Task RemoveFromGroupAsync(string connectionId, string groupName,
      CancellationToken cancellationToken = default)
    {
      return Task.CompletedTask;
    }
  }
}