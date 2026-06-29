namespace TGB.Resolver.Server.Contracts.Clock;

public sealed record ClockSyncRequest(string SessionId, DateTimeOffset ClientSentAt);

public sealed record ClockSyncResponse(
    string SessionId,
    DateTimeOffset ClientSentAt,
    DateTimeOffset ServerReceivedAt,
    DateTimeOffset ServerTransmittedAt,
    long EstimatedOffsetMs,
    long ServerProcessingMs)
{
    public static ClockSyncResponse Create(
        ClockSyncRequest request,
        DateTimeOffset serverReceivedAt,
        DateTimeOffset serverTransmittedAt)
    {
        return new ClockSyncResponse(
            request.SessionId,
            request.ClientSentAt,
            serverReceivedAt,
            serverTransmittedAt,
            (long)(serverTransmittedAt - request.ClientSentAt).TotalMilliseconds,
            (long)(serverTransmittedAt - serverReceivedAt).TotalMilliseconds);
    }
}
