using NodaTime;
using TGB.Resolver.Server.Features.Realtime;

namespace TGB.Resolver.Server.Tests.Realtime;

internal sealed class FakeTimeSource : ITimeSource
{
  public long Timestamp { get; private set; }
  public long Frequency { get; } = 1_000_000;

  public void AdvanceMs(double ms)
  {
    Timestamp += (long)(ms / 1000.0 * Frequency);
  }
}

internal sealed class FakeClockTimer : IClockTimer
{
  public void Configure(double periodMs)
  {
  }

  public void Start()
  {
  }

  public void Stop()
  {
  }

  public void WaitForTrigger()
  {
    throw new NotSupportedException("tests drive ProcessDue directly");
  }

  public void Dispose()
  {
  }
}

internal sealed class FakeWallClock(long startMs) : IClock
{
  public Instant GetCurrentInstant()
  {
    return Instant.FromUnixTimeMilliseconds(startMs);
  }
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
    var clock = CreateClock(time, new FakeWallClock(1_000_000));
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