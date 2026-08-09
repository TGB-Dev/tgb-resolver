using TGB.Resolver.Server.Commons.Exceptions;
using TGB.Resolver.Server.Features.Realtime;

namespace TGB.Resolver.Server.Features.Show;

public class TimelineOrchestrator(
  IServiceScopeFactory scopeFactory,
  RealtimeClock clock)
{
  private readonly HashSet<ScheduleTicket> _tickets = [];
  private readonly Lock _lock = new();

  public virtual void ScheduleAdvance(long delayMs)
  {
    var ticket = clock.ScheduleIn(
      TimeSpan.FromMilliseconds(delayMs),
      () => { _ = RunAdvanceAsync(); });
    lock (_lock)
    {
      _tickets.Add(ticket);
    }
  }

  public virtual void CancelAdvance()
  {
    lock (_lock)
    {
      foreach (var ticket in _tickets) clock.Cancel(ticket);
      _tickets.Clear();
    }
  }

  private async Task RunAdvanceAsync()
  {
    try
    {
      using var scope = scopeFactory.CreateScope();
      var service = scope.ServiceProvider.GetRequiredService<ShowStateService>();
      await service.AdvancePlaybackAsync(CancellationToken.None);
    }
    catch (VersionDriftException)
    {
      using var scope = scopeFactory.CreateScope();
      var service = scope.ServiceProvider.GetRequiredService<ShowStateService>();
      await service.RescheduleAdvanceAsync(CancellationToken.None);
    }
  }
}
