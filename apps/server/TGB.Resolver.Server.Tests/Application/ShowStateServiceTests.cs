using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TGB.Resolver.Server.Application.Serialization;
using TGB.Resolver.Server.Application.Shows;
using TGB.Resolver.Server.Contracts.Playback;
using TGB.Resolver.Server.Contracts.Realtime;
using TGB.Resolver.Server.Hubs;
using TGB.Resolver.Server.Infrastructure.Persistence;

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

        var service = new ShowStateService(
            dbContext,
            new AppJsonSerializer(AppJsonSerializerContext.Default),
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

    private sealed class StubHubContext : IHubContext<ShowHub, IShowHubClient>
    {
        public IHubClients<IShowHubClient> Clients { get; } = new StubHubClients();

        public IGroupManager Groups { get; } = new StubGroupManager();
    }

    private sealed class StubHubClients : IHubClients<IShowHubClient>
    {
        public IShowHubClient All { get; } = new StubShowHubClient();

        public IShowHubClient AllExcept(IReadOnlyList<string> excludedConnectionIds) => All;

        public IShowHubClient Client(string connectionId) => All;

        public IShowHubClient Clients(IReadOnlyList<string> connectionIds) => All;

        public IShowHubClient Group(string groupName) => All;

        public IShowHubClient GroupExcept(string groupName, IReadOnlyList<string> excludedConnectionIds) => All;

        public IShowHubClient Groups(IReadOnlyList<string> groupNames) => All;

        public IShowHubClient User(string userId) => All;

        public IShowHubClient Users(IReadOnlyList<string> userIds) => All;
    }

    private sealed class StubShowHubClient : IShowHubClient
    {
        public Task LiveModeChanged(LiveModeChangedMessage message) => Task.CompletedTask;

        public Task PlaybackStateChanged(PlaybackStateChangedMessage message) => Task.CompletedTask;

        public Task ShowRefetchRequired(ShowRefetchRequiredMessage message) => Task.CompletedTask;
    }

    private sealed class StubGroupManager : IGroupManager
    {
        public Task AddToGroupAsync(string connectionId, string groupName, CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task RemoveFromGroupAsync(string connectionId, string groupName, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }
}
