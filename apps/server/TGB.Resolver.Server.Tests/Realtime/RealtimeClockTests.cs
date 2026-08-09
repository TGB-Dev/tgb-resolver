using NodaTime;
using TGB.Resolver.Server.Features.Realtime;

namespace TGB.Resolver.Server.Tests.Realtime;

internal sealed class FakeTimeSource : ITimeSource
{
  public long Timestamp { get; set; }
  public long Frequency { get; } = 1_000_000;
  public void AdvanceMs(double ms) => Timestamp += (long)(ms / 1000.0 * Frequency);
}

internal sealed class FakeClockTimer : IClockTimer
{
  public double PeriodMs { get; private set; }
  public bool IsRunning { get; private set; }
  public int StartCount { get; private set; }
  public void Configure(double periodMs) => PeriodMs = periodMs;
  public void Start() { IsRunning = true; StartCount++; }
  public void Stop() => IsRunning = false;
  public void WaitForTrigger() => throw new NotSupportedException("tests drive ProcessDue directly");
  public void Dispose() { }
}

internal sealed class FakeWallClock : IClock
{
  private long _ms;
  public FakeWallClock(long startMs) => _ms = startMs;
  public void AdvanceMs(long ms) => _ms += ms;
  public Instant GetCurrentInstant() => Instant.FromUnixTimeMilliseconds(_ms);
  public DateTimeZone GetZone() => DateTimeZone.Utc;
}

public sealed class RealtimeClockTests
{
  private static RealtimeClock CreateClock(FakeTimeSource time, FakeWallClock wall,
    double? rate = null)
  {
    var clock = new RealtimeClock(new FakeClockTimer(), time, wall);
    clock.SetTickRate(rate);
    return clock;
  }

  [Test]
  public async Task ScheduleIn_FiresWhenDeadlinePasses()
  {
    var time = new FakeTimeSource();
    var clock = CreateClock(time, new FakeWallClock(1_000_000));
    var fired = false;
    clock.ScheduleIn(TimeSpan.FromMilliseconds(50), () => fired = true);

    time.AdvanceMs(49);
    clock.ProcessDue();
    await Assert.That(fired).IsFalse();

    time.AdvanceMs(2);
    clock.ProcessDue();
    await Assert.That(fired).IsTrue();
  }

  [Test]
  public async Task Cancel_PreventsScheduledAction()
  {
    var time = new FakeTimeSource();
    var clock = CreateClock(time, new FakeWallClock(1_000_000));
    var fired = false;
    var ticket = clock.ScheduleIn(TimeSpan.FromMilliseconds(50), () => fired = true);

    clock.Cancel(ticket);
    time.AdvanceMs(100);
    clock.ProcessDue();
    await Assert.That(fired).IsFalse();
  }

  [Test]
  public async Task SetTickRate_NullDefaultsToSixty()
  {
    var time = new FakeTimeSource();
    var clock = CreateClock(time, new FakeWallClock(1_000_000), null);
    await Assert.That(clock.TickRate).IsEqualTo(60);
    await Assert.That(clock.PeriodMs).IsEqualTo(1000.0 / 60);
  }

  [Test]
  public async Task SetTickRate_RejectsDisallowedRate()
  {
    var time = new FakeTimeSource();
    var clock = CreateClock(time, new FakeWallClock(1_000_000), 60);
    await Assert.That(() => clock.SetTickRate(45.5)).Throws<ArgumentOutOfRangeException>();
  }

  [Test]
  public async Task GetCurrentInstant_TracksAnchoredWallClock()
  {
    var time = new FakeTimeSource();
    var wall = new FakeWallClock(5_000);
    var clock = CreateClock(time, wall, 60);
    time.AdvanceMs(500);
    await Assert.That(clock.GetCurrentInstant().ToUnixTimeMilliseconds()).IsEqualTo(5_500);
  }
}
