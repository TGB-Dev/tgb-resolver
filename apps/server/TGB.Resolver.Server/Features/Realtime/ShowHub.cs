using Microsoft.AspNetCore.SignalR;
using NodaTime;
using TGB.Resolver.Server.Features.Show.Dto;
using TypedSignalR.Client;

namespace TGB.Resolver.Server.Features.Realtime;

[Hub]
public interface IShowHub
{
  Task<ClockSyncResponse> SyncClock(ClockSyncRequest request);
}

public sealed class ShowHub(IClock clock) : Hub<IShowHubClient>, IShowHub
{
  public Task<ClockSyncResponse> SyncClock(ClockSyncRequest request)
  {
    var receivedAt = clock.GetCurrentInstant();
    var transmittedAt = clock.GetCurrentInstant();
    return Task.FromResult(ClockSyncResponse.Create(request, receivedAt, transmittedAt));
  }
}