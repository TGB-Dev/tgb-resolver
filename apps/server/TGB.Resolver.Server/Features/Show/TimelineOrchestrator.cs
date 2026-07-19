using TGB.Resolver.Server.Commons.Exceptions;

namespace TGB.Resolver.Server.Features.Show;

/// <summary>
///     Manages the orchestration of timeline events, allowing for scheduling and cancellation of
///     delayed operations related to timeline advancements. This class is thread-safe and ensures
///     proper handling of concurrent modifications.
/// </summary>
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