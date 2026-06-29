namespace TGB.Resolver.Server.Domain.Shows;

public enum ShowMode
{
    Editing,
    Live
}

public enum ShowSource
{
    Xml,
    Bundle,
    Manual
}

public enum PlaybackStatus
{
    Idle,
    Running,
    Paused,
    Completed
}

public enum TimelineEventType
{
    Res,
    Img,
    Sfx
}

public sealed record ShowState(
    int SchemaVersion,
    int ShowVersion,
    ShowMode Mode,
    ShowMeta Meta,
    ContestState Contest,
    AutomationState Automation,
    PlaybackState Playback,
    AssetCollection Assets,
    IReadOnlyList<TimelineEvent> Timeline);

public sealed record ShowMeta(
    string Title,
    string? ContestId,
    ShowSource Source);

public sealed record ContestState(
    int DurationSeconds,
    int FreezeDurationSeconds,
    IReadOnlyList<ContestTeam> PreFreezeSnapshot);

public sealed record ContestTeam(
    int TeamId,
    string RealName,
    string Username,
    int Score,
    int Rank);

public sealed record AutomationState(
    bool AutoResolveEnabled,
    int AutoResolveSpeedMs,
    bool FullAutoEnabled);

public sealed record PlaybackState(
    PlaybackStatus Status,
    int? CurrentResolveEventId,
    int? CurrentEventId,
    ActivePlaybackSegment? ActiveSegment,
    long? StartedAt);

public sealed record ActivePlaybackSegment(
    int ResolveEventId,
    int? NextResolveEventId,
    IReadOnlyList<int> InlineEventIds,
    int CurrentInlineIndex);

public sealed record AssetCollection(
    IReadOnlyList<ShowAsset> Images,
    IReadOnlyList<ShowAsset> Sfx);

public sealed record ShowAsset(
    string Id,
    string Kind,
    string FileName,
    string OriginalName,
    string ContentType,
    long SizeBytes,
    string Xxh364);

public sealed record TimelineEvent(
    int Id,
    TimelineEventType Type,
    double? TriggerOffsetSeconds,
    bool? RequireManualInteraction,
    string? CustomName,
    ResolveEventPayload? Resolve,
    MediaEventPayload? Image,
    MediaEventPayload? Sfx);

public sealed record ResolveEventPayload(
    string RealName,
    string Username,
    string Problem,
    int NewScore,
    int NewRank);

public sealed record MediaEventPayload(
    string AssetId,
    double? DurationSeconds);
