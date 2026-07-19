using TGB.Resolver.Server.Commons.Types;

// ReSharper disable ClassNeverInstantiated.Global
namespace TGB.Resolver.Server.Features.Show.Dto;

public sealed record ImportXmlRequest(string Xml, IReadOnlyList<string>? ExcludedUsernames);

public sealed record ImportBundleRequest(string Bytes);

public sealed record ResolveEventRenameRequest(int ShowVersion, string CustomName);

public sealed record NonResolveEventPatchRequest(
    int ShowVersion,
    TimelineEventType? Type,
    double? TriggerOffsetSeconds,
    bool? RequireManualInteraction,
    string? CustomName,
    MediaEventPatchPayload? Payload);

public sealed record MediaEventPatchPayload(
    string? ImageId,
    string? SfxId,
    double? DurationSeconds);

public sealed record CreateTimelineEventRequest(
    int ShowVersion,
    TimelineEventType Type,
    int RelativeToEventId,
    bool Before,
    double? TriggerOffsetSeconds,
    bool? RequireManualInteraction,
    string? CustomName,
    MediaEventPatchPayload? Payload);

public sealed record MoveTimelineEventRequest(int ShowVersion, int RelativeToEventId, bool Before);

public sealed record PatchTimelineEventRequest(
    int ShowVersion,
    string? CustomName,
    TimelineEventType? Type,
    double? TriggerOffsetSeconds,
    bool? RequireManualInteraction,
    MediaEventPatchPayload? Payload);

public sealed record SetTimelineModeRequest(int ShowVersion, TimelineMode TimelineMode);

public sealed record SetAutomationRequest(
    int ShowVersion,
    bool? AutoResolveEnabled,
    int? AutoResolveSpeedMs,
    bool? FullAutoEnabled);

public sealed record UpsertAssetRequest(
    int ShowVersion,
    string Kind,
    string FileName,
    string ContentType,
    string Bytes);