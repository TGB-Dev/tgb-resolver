using TGB.Resolver.Server.Contracts.Clock;

namespace TGB.Resolver.Server.Tests.Messaging;

public sealed class ClockSyncTests
{
    [Test]
    public async Task CreateResponse_ComputesOffsetFromServerAndClientTimes()
    {
        var request = new ClockSyncRequest(
            "session-1",
            DateTimeOffset.Parse("2026-06-29T12:00:00Z"));
        var receivedAt = DateTimeOffset.Parse("2026-06-29T12:00:00.050Z");
        var transmittedAt = DateTimeOffset.Parse("2026-06-29T12:00:00.075Z");

        var response = ClockSyncResponse.Create(request, receivedAt, transmittedAt);

        await Assert.That(response.SessionId).IsEqualTo("session-1");
        await Assert.That(response.EstimatedOffsetMs).IsEqualTo(75);
        await Assert.That(response.ServerProcessingMs).IsEqualTo(25);
    }
}
