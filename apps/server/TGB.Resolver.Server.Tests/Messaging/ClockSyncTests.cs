using TGB.Resolver.Server.Features.Show.Dto;

namespace TGB.Resolver.Server.Tests.Messaging;

public sealed class ClockSyncTests
{
  [Test]
  public async Task CreateResponse_UsesUnixMilliseconds()
  {
    var request = new ClockSyncRequest(
      "session-1",
      1_782_734_400_000);
    var receivedAt = DateTimeOffset.Parse("2026-06-29T12:00:00.050Z");
    var transmittedAt = DateTimeOffset.Parse("2026-06-29T12:00:00.075Z");

    var response = ClockSyncResponse.Create(request, receivedAt, transmittedAt);

    await Assert.That(response.SessionId).IsEqualTo("session-1");
    await Assert.That(response.ClientSentAtUnixMs).IsEqualTo(1_782_734_400_000);
    await Assert.That(response.ServerReceivedAtUnixMs).IsEqualTo(1_782_734_400_050);
    await Assert.That(response.ServerTransmittedAtUnixMs).IsEqualTo(1_782_734_400_075);
  }
}