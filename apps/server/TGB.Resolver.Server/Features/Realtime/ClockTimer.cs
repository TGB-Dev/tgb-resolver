using Haukcode.HighResolutionTimer;

namespace TGB.Resolver.Server.Features.Realtime;

public interface IClockTimer : IDisposable
{
  void Configure(double periodMs);
  void Start();
  void Stop();
  void WaitForTrigger();
}

public sealed class HrClockTimer : IClockTimer
{
  private readonly HighResolutionTimer _timer = new();

  public void Configure(double periodMs)
  {
    _timer.SetPeriod(periodMs);
  }

  public void Start()
  {
    _timer.Start();
  }

  public void Stop()
  {
    _timer.Stop();
  }

  public void WaitForTrigger()
  {
    _timer.WaitForTrigger();
  }

  public void Dispose()
  {
    _timer.Dispose();
  }
}