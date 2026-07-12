using TGB.Resolver.Server.Commons.Types;

namespace TGB.Resolver.Server.Features.Show.Dto;

public sealed record ShowStateSnapshot(
  int SchemaVersion,
  int ShowVersion,
  ShowMode Mode,
  TimelineMode TimelineMode,
  ShowMetaSnapshot Meta,
  ContestSnapshot Contest,
  AutomationSnapshot Automation,
  PlaybackStateSnapshot Playback,
  AssetCollectionSnapshot Assets,
  IReadOnlyList<TimelineEventSnapshot> Timeline);

public sealed record ShowMetaSnapshot(
  string Title,
  string? ContestId,
  ShowSource Source);

public sealed record ContestSnapshot(
  int DurationSeconds,
  int FreezeDurationSeconds,
  IReadOnlyList<ContestTeamSnapshot> PreFreezeSnapshot);

public sealed record ContestTeamSnapshot(
  int TeamId,
  string RealName,
  string Username,
  double Score,
  int Rank);

public sealed record AutomationSnapshot(
  bool AutoResolveEnabled,
  int AutoResolveSpeedMs,
  bool FullAutoEnabled);

public sealed record PlaybackStateSnapshot(
  PlaybackStatus Status,
  int? CurrentResolveEventId,
  int? CurrentEventId,
  ActivePlaybackSegmentSnapshot? ActiveSegment,
  long? StartedAt,
  long ExecutionSequence);

public sealed record ActivePlaybackSegmentSnapshot(
  int ResolveEventId,
  int? NextResolveEventId,
  IReadOnlyList<int> InlineEventIds,
  int CurrentInlineIndex);

public sealed record AssetCollectionSnapshot(
  IReadOnlyList<ShowAssetSnapshot> Images,
  IReadOnlyList<ShowAssetSnapshot> Sfx);

public sealed record ShowAssetSnapshot(
  string Id,
  string Kind,
  string FileName,
  string OriginalName,
  string ContentType,
  long SizeBytes,
  string Xxh364);

public sealed record TimelineEventSnapshot(
  int Id,
  int Position,
  TimelineEventType Type,
  double? TriggerOffsetSeconds,
  bool? RequireManualInteraction,
  string? CustomName,
  ResolveEventPayloadSnapshot? Resolve,
  MediaEventPayloadSnapshot? Image,
  MediaEventPayloadSnapshot? Sfx);

public sealed record ResolveEventPayloadSnapshot(
  string RealName,
  string Username,
  string Problem,
  double NewScore,
  int NewRank);

public sealed record MediaEventPayloadSnapshot(
  string AssetId,
  double? DurationSeconds);