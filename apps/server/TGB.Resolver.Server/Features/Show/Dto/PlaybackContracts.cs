namespace TGB.Resolver.Server.Features.Show.Dto;

public sealed record VersionedCommandRequest(int ShowVersion);

public sealed record SeekPlaybackRequest(int ShowVersion, int EventId);