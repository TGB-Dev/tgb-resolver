using TGB.Resolver.Server.Features.Realtime;

namespace TGB.Resolver.Server.Tests.Realtime;

public sealed class TickRatesTests
{
  [Test]
  public async Task Allowed_ContainsEveryExpectedFrameRate()
  {
    var expected = new[]
      { 120, 120 / 1.001, 100, 60, 60 / 1.001, 50, 30, 30 / 1.001, 25, 24, 24 / 1.001 };
    foreach (var rate in expected) await Assert.That(TickRates.IsAllowed(rate)).IsTrue();
    await Assert.That(TickRates.Allowed).IsEquivalentTo(expected);
  }

  [Test]
  public async Task IsAllowed_RejectsUnknownRate()
  {
    await Assert.That(TickRates.IsAllowed(45.5)).IsFalse();
  }

  [Test]
  public async Task Default_IsAnAllowedFrameRate()
  {
    await Assert.That(TickRates.IsAllowed(TickRates.Default)).IsTrue();
  }
}