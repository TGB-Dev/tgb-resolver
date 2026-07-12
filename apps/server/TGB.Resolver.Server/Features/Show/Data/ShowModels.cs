using TGB.Resolver.IcpcXmlParser;
using TGB.Resolver.Server.Commons.Types;

namespace TGB.Resolver.Server.Features.Show.Data;

public sealed record ShowState(
  int SchemaVersion,
  int ShowVersion,
  ShowMode Mode,
  TimelineMode TimelineMode,
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
  double Score,
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
  long? StartedAt,
  long ExecutionSequence);

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
  int Position,
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
  double NewTotalScore,
  int NewRank,
  double NewProblemScore,
  string ProblemDisplayName,
  VerdictRunResult Verdict);

public sealed record MediaEventPayload(
  string AssetId,
  double? DurationSeconds);