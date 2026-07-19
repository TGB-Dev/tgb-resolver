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

/// <summary>
///   Centralized contest definition. The problem and user maps are derived from
///   the original ICPC XML and let timeline events reference entities by id
///   instead of storing denormalized display strings.
/// </summary>
public sealed record ContestState(
  int DurationSeconds,
  int FreezeDurationSeconds,
  IReadOnlyList<ProblemDefinition> Problems,
  IReadOnlyList<UserDefinition> Users,
  IReadOnlyList<FreezeSnapshotEntry> PreFreezeSnapshot);

public sealed record ProblemDefinition(
  int Id,
  string Label,
  string Name,
  double Score);

public sealed record UserDefinition(
  int Id,
  string Username,
  string RealName);

/// <summary>
///   Frozen standings entry for a single team at the scoreboard freeze. Carries
///   the per-problem score/verdict matrix plus the last run submitted before the
///   freeze timestamp.
/// </summary>
public sealed record FreezeSnapshotEntry(
  int UserId,
  double TotalScore,
  int Rank,
  IReadOnlyList<ProblemFreezeResult> Problems,
  int? LastRunId,
  double? LastSubmittedSeconds);

public sealed record ProblemFreezeResult(
  int ProblemId,
  double Score,
  VerdictRunResult Verdict);

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
  MediaEventPayload? Sfx,
  ResolveEventPayload? Pre,
  Dictionary<string, object?>? Custom);

/// <summary>
///   Resolve (and pre-resolve) payload. References the team and problem by id;
///   display names are resolved from the contest's <see cref="UserDefinition" />
///   and <see cref="ProblemDefinition" /> maps. <see cref="SubmissionSeconds" />
///   is the submission time from contest start (the ICPC &lt;time&gt; field).
/// </summary>
public sealed record ResolveEventPayload(
  int UserId,
  int ProblemId,
  double NewTotalScore,
  int NewRank,
  double NewProblemScore,
  VerdictRunResult Verdict,
  double SubmissionSeconds);

public sealed record MediaEventPayload(
  string AssetId,
  double? DurationSeconds);