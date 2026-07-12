using Microsoft.AspNetCore.SignalR;
using TGB.Resolver.Server.Features.Show.Dto;

namespace TGB.Resolver.Server.Features.Realtime;

public sealed class ShowHub(TimeProvider timeProvider) : Hub<IShowHubClient>
{
  public Task<ClockSyncResponse> SyncClock(ClockSyncRequest request)
  {
    var receivedAt = timeProvider.GetUtcNow();
    var transmittedAt = timeProvider.GetUtcNow();
    return Task.FromResult(ClockSyncResponse.Create(request, receivedAt, transmittedAt));
  }
}