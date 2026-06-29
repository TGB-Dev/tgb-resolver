namespace TGB.Resolver.Server.Contracts.Commands;

public sealed record ImportXmlRequest(string Xml);

public sealed record ImportBundleRequest(string Bytes);

public sealed record ResolveEventRenameRequest(int ShowVersion, string CustomName);

public sealed record NonResolveEventPatchRequest(
    int ShowVersion,
    TGB.Resolver.Server.Contracts.Show.TimelineEventType? Type,
    double? TriggerOffsetSeconds,
    bool? RequireManualInteraction,
    string? CustomName,
    MediaEventPatchPayload? Payload);

public sealed record MediaEventPatchPayload(
    string? ImageId,
    string? SfxId,
    double? DurationSeconds);
