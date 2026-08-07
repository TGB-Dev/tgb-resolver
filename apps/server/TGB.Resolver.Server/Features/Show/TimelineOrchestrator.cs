using TGB.Resolver.Server.Commons.Exceptions;

namespace TGB.Resolver.Server.Features.Show;

/// <summary>
///   Manages the orchestration of timeline events, allowing for scheduling and cancellation of
///   delayed operations related to timeline advancements. This class is thread-safe and ensures
///   proper handling of concurrent modifications.
/// </summary>
public class TimelineOrchestrator(
  IServiceScopeFactory scopeFactory)
{
  private readonly Lock _lock = new();
  private readonly HashSet<CancellationTokenSource> _ctsSet = [];

  public virtual void ScheduleAdvance(long delayMs)
  {
    var cts = new CancellationTokenSource();
    lock (_lock) _ctsSet.Add(cts);

    _ = AdvanceAfterDelayAsync(delayMs, cts);
  }

  public virtual void CancelAdvance()
  {
    lock (_lock)
    {
      foreach (var cts in _ctsSet) cts.Cancel();
      _ctsSet.Clear();
    }
  }

  private async Task AdvanceAfterDelayAsync(long delayMs, CancellationTokenSource cts)
  {
    try
    {
      await Task.Delay(TimeSpan.FromMilliseconds(delayMs), cts.Token);

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
    finally
    {
      lock (_lock) _ctsSet.Remove(cts);
      cts.Dispose();
    }
  }
}