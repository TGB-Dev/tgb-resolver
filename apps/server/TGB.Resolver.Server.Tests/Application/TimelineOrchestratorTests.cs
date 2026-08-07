using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using NSubstitute;
using TGB.Resolver.Server.Commons.Data;
using TGB.Resolver.Server.Commons.Serialization;
using TGB.Resolver.Server.Features.Assets;
using TGB.Resolver.Server.Features.Realtime;
using TGB.Resolver.Server.Features.Show;
using TGB.Resolver.Server.Features.Show.Data;
using TGB.Resolver.Server.Features.Show.Dto;
// ReSharper disable once RedundantUsingDirective
using NodaTime;

namespace TGB.Resolver.Server.Tests.Application;

public sealed class TimelineOrchestratorTests
{
  [Test]
  public async Task ScheduleAdvance_AllowsMultipleConcurrentAdvances()
  {
    var (provider, hubContext) = CreateProvider();
    var orchestrator = provider.GetRequiredService<TimelineOrchestrator>();
    var service = provider.GetRequiredService<ShowStateService>();
    await service.EnsureSeededAsync();

    var version = (await service.GetSnapshotAsync()).ShowVersion;
    await service.StartPlaybackAsync(new VersionedCommandRequest(version));

    var before = PlaybackBroadcastCount(hubContext);

    // Second timer must NOT cancel the first
    orchestrator.ScheduleAdvance(30);
    orchestrator.ScheduleAdvance(60);

    await Task.Delay(TimeSpan.FromMilliseconds(200));

    var after = PlaybackBroadcastCount(hubContext);
    await Assert.That(after - before).IsGreaterThanOrEqualTo(2);
  }

  private static int PlaybackBroadcastCount(IHubContext<ShowHub, IShowHubClient> hubContext)
  {
    return hubContext.Clients.All.ReceivedCalls()
      .Count(call => call.GetMethodInfo().Name == nameof(IShowHubClient.PlaybackStateChanged));
  }

  private static (ServiceProvider Provider, IHubContext<ShowHub, IShowHubClient> HubContext)
    CreateProvider()
  {
    var dbContext = new ResolverDbContext(
      new DbContextOptionsBuilder<ResolverDbContext>()
        .UseSqlite("Data Source=:memory:")
        .Options);
    dbContext.Database.OpenConnection();
    dbContext.Database.EnsureCreated();

    var serializer = new AppJsonSerializer(AppJsonSerializerContext.Default);
    var hubContext = Substitute.For<IHubContext<ShowHub, IShowHubClient>>();
    hubContext.Clients.Returns(Substitute.For<IHubClients<IShowHubClient>>());
    hubContext.Clients.All.Returns(Substitute.For<IShowHubClient>());

    var services = new ServiceCollection();
    services.AddSingleton(dbContext);
    services.AddSingleton(serializer);
    services.AddSingleton(sp => new ShowRawRepository(dbContext, serializer, SystemClock.Instance));
    services.AddSingleton(hubContext);
    services.AddSingleton(CreateAssetStore());
    services.AddSingleton<TimelineOrchestrator>();
    services.AddSingleton(sp => new ShowStateService(
      sp.GetRequiredService<ShowRawRepository>(),
      serializer,
      hubContext,
      sp.GetRequiredService<TimelineOrchestrator>(),
      SystemClock.Instance,
      sp.GetRequiredService<AssetStore>()));

    return (services.BuildServiceProvider(), hubContext);
  }

  private static AssetStore CreateAssetStore()
  {
    var environment = Substitute.For<IHostEnvironment>();
    environment.ContentRootPath.Returns(Path.GetTempPath());
    return new AssetStore(environment);
  }
}