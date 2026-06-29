using Microsoft.AspNetCore.SignalR;
using TGB.Resolver.Server.Contracts.Clock;
using TGB.Resolver.Server.Contracts.Realtime;

namespace TGB.Resolver.Server.Hubs;

public sealed class ShowHub : Hub<IShowHubClient>
{
    private readonly TimeProvider _timeProvider;

    public ShowHub(TimeProvider timeProvider)
    {
        _timeProvider = timeProvider;
    }

    public Task<ClockSyncResponse> SyncClock(ClockSyncRequest request)
    {
        var receivedAt = _timeProvider.GetUtcNow();
        var transmittedAt = _timeProvider.GetUtcNow();
        return Task.FromResult(ClockSyncResponse.Create(request, receivedAt, transmittedAt));
    }
}
