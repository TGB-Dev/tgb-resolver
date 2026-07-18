using TGB.Resolver.Server.Commons.Exceptions;

namespace TGB.Resolver.Server.Features.Show;

public sealed class TimelineOrchestrator(
  IServiceScopeFactory scopeFactory)
{
  private readonly Lock _lock = new();
  private CancellationTokenSource? _cts;

  public void ScheduleAdvance(long delayMs)
  {
    CancellationToken token;
    lock (_lock)
    {
      _cts?.Cancel();
      _cts = new CancellationTokenSource();
      token = _cts.Token;
    }

    _ = AdvanceAfterDelayAsync(delayMs, token);
  }

  public void CancelAdvance()
  {
    lock (_lock)
    {
      _cts?.Cancel();
      _cts = null;
    }
  }

  private async Task AdvanceAfterDelayAsync(long delayMs, CancellationToken token)
  {
    try
    {
      await Task.Delay(TimeSpan.FromMilliseconds(delayMs), token);

      using var scope = scopeFactory.CreateScope();
      var service = scope.ServiceProvider.GetRequiredService<ShowStateService>();
      await service.AdvancePlaybackAsync(CancellationToken.None);
    }
    catch (OperationCanceledException)
    {
    }
    catch (VersionDriftException)
    {
      using var scope = scopeFactory.CreateScope();
      var service = scope.ServiceProvider.GetRequiredService<ShowStateService>();
      await service.RescheduleAdvanceAsync(CancellationToken.None);
    }
  }
}