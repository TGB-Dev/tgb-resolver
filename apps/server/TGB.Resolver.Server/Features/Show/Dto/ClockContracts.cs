using NodaTime;
using Tapper;

namespace TGB.Resolver.Server.Features.Show.Dto;

[TranspilationSource]
public sealed record ClockSyncRequest(string SessionId, long ClientSentAtUnixMs);

[TranspilationSource]
public sealed record ClockSyncResponse(
    string SessionId,
    long ClientSentAtUnixMs,
    long ServerReceivedAtUnixMs,
    long ServerTransmittedAtUnixMs)
{
    public static ClockSyncResponse Create(
        ClockSyncRequest request,
        Instant serverReceivedAt,
        Instant serverTransmittedAt)
    {
        return new ClockSyncResponse(
            request.SessionId,
            request.ClientSentAtUnixMs,
            serverReceivedAt.ToUnixTimeMilliseconds(),
            serverTransmittedAt.ToUnixTimeMilliseconds());
    }
}