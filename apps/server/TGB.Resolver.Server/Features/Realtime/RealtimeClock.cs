using NodaTime;

namespace TGB.Resolver.Server.Features.Realtime;

public readonly record struct ScheduleTicket(long Id);

internal sealed record ScheduledOperation(long Id, Action Action);

public sealed class RealtimeClock : IHostedService, IDisposable
{
  private readonly HashSet<long> _cancelled = new();
  private readonly Lock _gate = new();
  private readonly PriorityQueue<ScheduledOperation, long> _queue = new();
  private readonly ITimeSource _time;
  private readonly IClockTimer _timer;
  private readonly IClock _wallClock;
  private long _anchorTimestamp;
  private long _appliedEpoch;
  private long _configureEpoch;
  private CancellationTokenSource? _cts;
  private long _nextId = 1;
  private Thread? _thread;
  private double _tickRate = TickRates.Default;
  private long _wallAnchorMs;

  public RealtimeClock(IClockTimer timer, ITimeSource time, IClock wallClock)
  {
    _timer = timer;
    _time = time;
    _wallClock = wallClock;
    _wallAnchorMs = wallClock.GetCurrentInstant().ToUnixTimeMilliseconds();
    _anchorTimestamp = _time.Timestamp;
  }

  public double TickRate => Volatile.Read(ref _tickRate);
  public double PeriodMs => 1000.0 / Volatile.Read(ref _tickRate);

  public void Dispose()
  {
    Stop();
    _timer.Dispose();
  }

  // ---- Hosted lifecycle ----

  public Task StartAsync(CancellationToken cancellationToken)
  {
    Start();
    return Task.CompletedTask;
  }

  public Task StopAsync(CancellationToken cancellationToken)
  {
    Stop();
    return Task.CompletedTask;
  }

  public ScheduleTicket ScheduleIn(TimeSpan delay, Action action)
  {
    var deadline = _time.Timestamp + (long)(delay.TotalSeconds * _time.Frequency);
    var op = new ScheduledOperation(Interlocked.Increment(ref _nextId), action);
    lock (_gate)
    {
      _queue.Enqueue(op, deadline);
    }

    return new ScheduleTicket(op.Id);
  }

  public void Cancel(ScheduleTicket ticket)
  {
    lock (_gate)
    {
      _cancelled.Add(ticket.Id);
    }
  }

  public void SetTickRate(double? tickRate)
  {
    var rate = tickRate ?? TickRates.Default;
    if (!TickRates.IsAllowed(rate))
      throw new ArgumentOutOfRangeException(nameof(tickRate), rate,
        "Tick rate not in allowed set.");
    Volatile.Write(ref _tickRate, rate);
    Interlocked.Increment(ref _configureEpoch);
  }

  public Instant GetCurrentInstant()
  {
    lock (_gate)
    {
      return Instant.FromUnixTimeMilliseconds(_wallAnchorMs +
                                              ElapsedMs(_time.Timestamp - _anchorTimestamp));
    }
  }

  /// <summary>Fires due scheduler operations. Called by the worker each tick and by tests directly.</summary>
  public void ProcessDue()
  {
    while (true)
    {
      ScheduledOperation op;
      lock (_gate)
      {
        if (!_queue.TryPeek(out var candidate, out var deadline)) break;
        if (deadline > _time.Timestamp) break;
        _queue.Dequeue();
        if (_cancelled.Remove(candidate.Id)) continue;
        op = candidate;
      }

      try
      {
        op.Action();
      }
      catch
      {
        // A scheduled action must never kill the tick loop.
      }
    }
  }

  public void Start()
  {
    if (_thread != null) return;
    _cts = new CancellationTokenSource();
    ApplyTimerPeriod();
    _thread = new Thread(() => Run(_cts.Token)) { IsBackground = true, Name = "RealtimeClock" };
    _thread.Start();
  }

  public void Stop()
  {
    _cts?.Cancel();
    try
    {
      _timer.Stop();
    }
    catch
    {
      /* ignore */
    }

    _thread?.Join(TimeSpan.FromSeconds(1));
    _thread = null;
  }

  private void Run(CancellationToken ct)
  {
    while (!ct.IsCancellationRequested)
    {
      try
      {
        _timer.WaitForTrigger();
      }
      catch
      {
        if (ct.IsCancellationRequested) break;
      }

      ProcessDue();
      MaybeReanchor();
      ApplyTimerPeriodIfChanged();
    }
  }

  private void ApplyTimerPeriod()
  {
    _timer.Configure(1000.0 / Volatile.Read(ref _tickRate));
    _timer.Start();
    _appliedEpoch = _configureEpoch;
  }

  private void ApplyTimerPeriodIfChanged()
  {
    var epoch = Volatile.Read(ref _configureEpoch);
    if (epoch == _appliedEpoch) return;
    _timer.Stop();
    _timer.Configure(1000.0 / Volatile.Read(ref _tickRate));
    _timer.Start();
    _appliedEpoch = epoch;
  }

  private void MaybeReanchor()
  {
    lock (_gate)
    {
      if (ElapsedMs(_time.Timestamp - _anchorTimestamp) >= 1000)
      {
        _wallAnchorMs = _wallClock.GetCurrentInstant().ToUnixTimeMilliseconds();
        _anchorTimestamp = _time.Timestamp;
      }
    }
  }

  private long ElapsedMs(long elapsedTicks)
  {
    return (long)(elapsedTicks * 1000.0 / _time.Frequency);
  }
}