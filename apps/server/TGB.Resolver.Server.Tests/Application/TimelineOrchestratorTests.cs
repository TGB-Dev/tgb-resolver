using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using NSubstitute;
using TGB.Resolver.Server.Commons.Data;
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

  [Test]
  public async Task ConcurrentGroup_TriggerOffsetChildren_FireInOffsetOrder()
  {
    var (provider, _) = CreateProvider();
    var service = provider.GetRequiredService<ShowStateService>();
    var repository = provider.GetRequiredService<ShowRawRepository>();
    await service.EnsureSeededAsync();

    // Concurrent group: a 30s parent with a simultaneous (0s) child and a
    // +1s child. Children must fire by their own offsets, not the parent's
    // duration, and even when both automation modes are disabled.
    var show = ShowRawRepository.CreateEmptyShow(1, ShowSource.Manual) with
    {
      Automation = new AutomationState(false, 3_000, false),
      Timeline =
      [
        new TimelineEvent(1, 1, TimelineEventType.Cus, 30, null, false, "Parent", null, null,
          null),
        new TimelineEvent(2, 2, TimelineEventType.Cus, null, 0, false, "Child0", null, null,
          null),
        new TimelineEvent(3, 3, TimelineEventType.Cus, null, 1, false, "Child1", null, null,
          null)
      ]
    };
    await repository.ReplaceAsync(show);

    var version = (await service.GetSnapshotAsync()).ShowVersion;
    await service.StartPlaybackAsync(new VersionedCommandRequest(version));

    // The 0s-offset child goes active right after the parent starts.
    await Task.Delay(TimeSpan.FromMilliseconds(150));
    var snapshot = await service.GetSnapshotAsync();
    await Assert.That(snapshot.Playback.CurrentEventId).IsEqualTo(2);
    await Assert.That(snapshot.Playback.ActiveEventIds).IsEquivalentTo([1, 2]);

    // The +1s-offset child fires ~1s after the parent started.
    await Task.Delay(TimeSpan.FromMilliseconds(1_150));
    snapshot = await service.GetSnapshotAsync();
    await Assert.That(snapshot.Playback.CurrentEventId).IsEqualTo(3);
    await Assert.That(snapshot.Playback.ActiveEventIds).IsEquivalentTo([1, 2, 3]);
  }

  [Test]
  public async Task StartPlayback_WithPendingOffsetAdvance_KeepsPendingTimersAlive()
  {
    var (provider, hubContext) = CreateProvider();
    var orchestrator = provider.GetRequiredService<TimelineOrchestrator>();
    var service = provider.GetRequiredService<ShowStateService>();
    await service.EnsureSeededAsync();

    var version = (await service.GetSnapshotAsync()).ShowVersion;
    await service.StartPlaybackAsync(new VersionedCommandRequest(version));

    var before = PlaybackBroadcastCount(hubContext);

    // StartPlaybackAsync already scheduled the 500ms advance for the 0.5s-offset
    // Pre event. Scheduling a shorter advance must not cancel it — the offset
    // child must still fire at its own offset.
    orchestrator.ScheduleAdvance(30);

    await Task.Delay(TimeSpan.FromMilliseconds(800));

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
