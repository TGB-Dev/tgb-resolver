using Tapper;
using TGB.Resolver.IcpcXmlParser;
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
  IReadOnlyList<ProblemDefinitionSnapshot> Problems,
  IReadOnlyList<UserDefinitionSnapshot> Users,
  IReadOnlyList<FreezeSnapshotEntrySnapshot> PreFreezeSnapshot);

public sealed record ProblemDefinitionSnapshot(int Id, string Label, string Name, double Score);

public sealed record UserDefinitionSnapshot(int Id, string Username, string RealName);

public sealed record FreezeSnapshotEntrySnapshot(
  int UserId,
  double TotalScore,
  double TotalPenalty,
  int Rank,
  IReadOnlyList<ProblemFreezeResultSnapshot> Problems,
  int? LastRunId,
  double? LastSubmittedSeconds);

public sealed record ProblemFreezeResultSnapshot(
  int ProblemId,
  double Score,
  VerdictRunResult Verdict,
  int PreFreezeSubmissionCount,
  int PostFreezeSubmissionCount);

public sealed record AutomationSnapshot(
  bool AutoResolveEnabled,
  int AutoResolveSpeedMs,
  bool FullAutoEnabled);

[TranspilationSource]
public sealed record PlaybackStateSnapshot(
  PlaybackStatus Status,
  int? CurrentEventId,
  IReadOnlyList<int> ActiveEventIds,
  long? StartedAt);

public sealed record AssetCollectionSnapshot(
  IReadOnlyList<ShowAssetSnapshot> Items)
{
  public IReadOnlyList<FolderNodeSnapshot> Folders { get; init; } = [];
}

public sealed record ShowAssetSnapshot(
  string Id,
  string FileName,
  string OriginalName,
  string ContentType,
  long SizeBytes,
  string Xxh3)
{
  public string? FolderId { get; init; }
}

public sealed record FolderNodeSnapshot(
  string Id,
  string Name,
  IReadOnlyList<FolderNodeSnapshot> Children);

[TranspilationSource]
public sealed record TimelineEventSnapshot(
  int Id,
  int Position,
  TimelineEventType Type,
  double? TriggerOffsetSeconds,
  bool? RequireManualInteraction,
  string? CustomName,
  ResolveEventPayloadSnapshot? Resolve,
  MediaEventPayloadSnapshot? Image,
  MediaEventPayloadSnapshot? Sfx,
  ResolveEventPayloadSnapshot? Pre,
  Dictionary<string, object?>? Custom);

[TranspilationSource]
public sealed record ResolveEventPayloadSnapshot(
  int UserId,
  int ProblemId,
  double NewTotalScore,
  double NewTotalPenalty,
  int NewRank,
  double NewProblemScore,
  VerdictRunResult Verdict,
  double TimeSinceStart);

[TranspilationSource]
public sealed record MediaEventPayloadSnapshot(
  string AssetId,
  double? DurationSeconds);