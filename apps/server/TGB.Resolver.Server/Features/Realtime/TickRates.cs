namespace TGB.Resolver.Server.Features.Realtime;

public static class TickRates
{
  public const double Default = 60;
  private const double Epsilon = 1e-6;

  public static readonly double[] Allowed =
  [
    120, 120 / 1.001, 100, 60, 60 / 1.001, 50, 30, 30 / 1.001, 25, 24, 24 / 1.001
  ];

  public static bool IsAllowed(double value)
  {
    foreach (var candidate in Allowed)
    {
      if (Math.Abs(value - candidate) < Epsilon) return true;
    }
    return false;
  }
}
