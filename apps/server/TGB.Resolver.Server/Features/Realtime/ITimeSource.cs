namespace TGB.Resolver.Server.Features.Realtime;

public interface ITimeSource
{
  long Timestamp { get; }
  long Frequency { get; }
}

public sealed class StopwatchTimeSource : ITimeSource
{
  public long Timestamp => System.Diagnostics.Stopwatch.GetTimestamp();
  public long Frequency => System.Diagnostics.Stopwatch.Frequency;
}
