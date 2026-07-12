namespace TGB.Resolver.Server.Features.Show.Dto;

public sealed record ClockSyncRequest(string SessionId, long ClientSentAtUnixMs);

public sealed record ClockSyncResponse(
  string SessionId,
  long ClientSentAtUnixMs,
  long ServerReceivedAtUnixMs,
  long ServerTransmittedAtUnixMs)
{
  public static ClockSyncResponse Create(
    ClockSyncRequest request,
    DateTimeOffset serverReceivedAt,
    DateTimeOffset serverTransmittedAt)
  {
    return new ClockSyncResponse(
      request.SessionId,
      request.ClientSentAtUnixMs,
      serverReceivedAt.ToUnixTimeMilliseconds(),
      serverTransmittedAt.ToUnixTimeMilliseconds());
  }
}