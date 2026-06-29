using System.Text;
using FastEndpoints;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using IcpcParser = TGB.Resolver.IcpcXmlParser.IcpcXmlParser;
using ContractTimelineEventType = TGB.Resolver.Server.Contracts.Show.TimelineEventType;
using TGB.Resolver.Server.Application.Mapping;
using TGB.Resolver.Server.Application.Serialization;
using TGB.Resolver.Server.Contracts.Commands;
using TGB.Resolver.Server.Contracts.Playback;
using TGB.Resolver.Server.Contracts.Realtime;
using TGB.Resolver.Server.Contracts.Show;
using TGB.Resolver.Server.Domain.Shows;
using TGB.Resolver.Server.Hubs;
using TGB.Resolver.Server.Infrastructure.Persistence;

namespace TGB.Resolver.Server.Application.Shows;

public interface IShowStateService
{
    Task EnsureSeededAsync(CancellationToken cancellationToken = default);
    Task<ShowStateSnapshot> GetSnapshotAsync(CancellationToken cancellationToken = default);
    Task<ShowStateSnapshot> OptimizeAsync(VersionedCommandRequest request, CancellationToken cancellationToken = default);
    Task<ShowStateSnapshot> ClearAsync(VersionedCommandRequest request, CancellationToken cancellationToken = default);
    Task<ShowStateSnapshot> ImportXmlAsync(ImportXmlRequest request, CancellationToken cancellationToken = default);
    Task<ShowStateSnapshot> ImportBundleAsync(ImportBundleRequest request, CancellationToken cancellationToken = default);
    Task<byte[]> ExportBundleAsync(CancellationToken cancellationToken = default);
    Task<ShowStateSnapshot> RenameResolveEventAsync(int eventId, ResolveEventRenameRequest request, CancellationToken cancellationToken = default);
    Task<ShowStateSnapshot> PatchNonResolveEventAsync(int eventId, NonResolveEventPatchRequest request, CancellationToken cancellationToken = default);
    Task<ShowStateSnapshot> SetLiveModeAsync(bool enabled, CancellationToken cancellationToken = default);
    Task<ShowStateSnapshot> StartPlaybackAsync(VersionedCommandRequest request, CancellationToken cancellationToken = default);
    Task<ShowStateSnapshot> ResetPlaybackAsync(VersionedCommandRequest request, CancellationToken cancellationToken = default);
}

public sealed class ShowStateService : IShowStateService
{
    public const string LocalShowId = "local-show";
    public const int CurrentSchemaVersion = 1;

    private readonly ResolverDbContext _dbContext;
    private readonly IAppJsonSerializer _serializer;
    private readonly IHubContext<ShowHub, IShowHubClient> _hubContext;
    private readonly TimeProvider _timeProvider;

    public ShowStateService(
        ResolverDbContext dbContext,
        IAppJsonSerializer serializer,
        IHubContext<ShowHub, IShowHubClient> hubContext,
        TimeProvider timeProvider)
    {
        _dbContext = dbContext;
        _serializer = serializer;
        _hubContext = hubContext;
        _timeProvider = timeProvider;
    }

    public async Task EnsureSeededAsync(CancellationToken cancellationToken = default)
    {
        if (await _dbContext.ShowStates.AnyAsync(cancellationToken))
        {
            return;
        }

        var seeded = CreateSeededShow();
        var entity = new StoredShowState
        {
            Id = LocalShowId,
            ShowVersion = seeded.ShowVersion,
            PayloadJson = _serializer.Serialize(seeded),
            UpdatedAtUtc = _timeProvider.GetUtcNow()
        };

        _dbContext.ShowStates.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<ShowStateSnapshot> GetSnapshotAsync(CancellationToken cancellationToken = default)
    {
        var state = await LoadStateAsync(cancellationToken);
        return ShowContractMapper.ToContract(state);
    }

    public async Task<ShowStateSnapshot> OptimizeAsync(VersionedCommandRequest request, CancellationToken cancellationToken = default)
    {
        return await MutateAsync(
            request.ShowVersion,
            ShowRefetchReason.Optimized,
            state =>
            {
                var normalized = state.Timeline
                    .Where(eventItem => eventItem.Type == Domain.Shows.TimelineEventType.Res || eventItem.Image is not null || eventItem.Sfx is not null)
                    .Select((eventItem, index) => eventItem with { Id = index + 1 })
                    .ToArray();

                return state with
                {
                    ShowVersion = state.ShowVersion + 1,
                    Timeline = normalized
                };
            },
            cancellationToken);
    }

    public async Task<ShowStateSnapshot> ClearAsync(VersionedCommandRequest request, CancellationToken cancellationToken = default)
    {
        return await MutateAsync(
            request.ShowVersion,
            ShowRefetchReason.ShowReplaced,
            state => CreateEmptyShow(state.ShowVersion + 1, Domain.Shows.ShowSource.Manual),
            cancellationToken);
    }

    public async Task<ShowStateSnapshot> ImportXmlAsync(ImportXmlRequest request, CancellationToken cancellationToken = default)
    {
        var current = await LoadStateAsync(cancellationToken);
        var next = BuildShowFromXml(request.Xml, current.ShowVersion + 1);
        return await ReplaceAsync(next, ShowRefetchReason.ShowReplaced, cancellationToken);
    }

    public async Task<ShowStateSnapshot> ImportBundleAsync(ImportBundleRequest request, CancellationToken cancellationToken = default)
    {
        var json = Encoding.UTF8.GetString(Convert.FromBase64String(request.Bytes));
        var imported = _serializer.Deserialize<ShowState>(json) with
        {
            ShowVersion = (await LoadStateAsync(cancellationToken)).ShowVersion + 1,
            Meta = (_serializer.Deserialize<ShowState>(json)).Meta with { Source = Domain.Shows.ShowSource.Bundle }
        };

        return await ReplaceAsync(imported, ShowRefetchReason.ShowReplaced, cancellationToken);
    }

    public async Task<byte[]> ExportBundleAsync(CancellationToken cancellationToken = default)
    {
        var state = await LoadStateAsync(cancellationToken);
        return Encoding.UTF8.GetBytes(_serializer.Serialize(state));
    }

    public async Task<ShowStateSnapshot> RenameResolveEventAsync(
        int eventId,
        ResolveEventRenameRequest request,
        CancellationToken cancellationToken = default)
    {
        return await MutateAsync(
            request.ShowVersion,
            ShowRefetchReason.Optimized,
            state =>
            {
                var updatedTimeline = state.Timeline
                    .Select(eventItem => eventItem.Id == eventId && eventItem.Type == Domain.Shows.TimelineEventType.Res
                        ? eventItem with { CustomName = request.CustomName }
                        : eventItem)
                    .ToArray();

                return state with
                {
                    ShowVersion = state.ShowVersion + 1,
                    Timeline = updatedTimeline
                };
            },
            cancellationToken);
    }

    public async Task<ShowStateSnapshot> PatchNonResolveEventAsync(
        int eventId,
        NonResolveEventPatchRequest request,
        CancellationToken cancellationToken = default)
    {
        return await MutateAsync(
            request.ShowVersion,
            ShowRefetchReason.Optimized,
            state =>
            {
                var updatedTimeline = state.Timeline.Select(eventItem =>
                {
                    if (eventItem.Id != eventId || eventItem.Type == Domain.Shows.TimelineEventType.Res)
                    {
                        return eventItem;
                    }

                    return request.Type switch
                    {
                        ContractTimelineEventType.Img => eventItem with
                        {
                            Type = Domain.Shows.TimelineEventType.Img,
                            TriggerOffsetSeconds = request.TriggerOffsetSeconds ?? eventItem.TriggerOffsetSeconds,
                            RequireManualInteraction = request.RequireManualInteraction ?? eventItem.RequireManualInteraction,
                            CustomName = request.CustomName ?? eventItem.CustomName,
                            Image = new MediaEventPayload(
                                request.Payload?.ImageId ?? eventItem.Image?.AssetId ?? string.Empty,
                                request.Payload?.DurationSeconds ?? eventItem.Image?.DurationSeconds),
                            Sfx = null
                        },
                        ContractTimelineEventType.Sfx => eventItem with
                        {
                            Type = Domain.Shows.TimelineEventType.Sfx,
                            TriggerOffsetSeconds = request.TriggerOffsetSeconds ?? eventItem.TriggerOffsetSeconds,
                            RequireManualInteraction = request.RequireManualInteraction ?? eventItem.RequireManualInteraction,
                            CustomName = request.CustomName ?? eventItem.CustomName,
                            Sfx = new MediaEventPayload(
                                request.Payload?.SfxId ?? eventItem.Sfx?.AssetId ?? string.Empty,
                                request.Payload?.DurationSeconds ?? eventItem.Sfx?.DurationSeconds),
                            Image = null
                        },
                        _ => eventItem
                    };
                }).ToArray();

                return state with
                {
                    ShowVersion = state.ShowVersion + 1,
                    Timeline = updatedTimeline
                };
            },
            cancellationToken);
    }

    public async Task<ShowStateSnapshot> SetLiveModeAsync(bool enabled, CancellationToken cancellationToken = default)
    {
        var result = await MutateWithoutVersionAsync(
            state => state with
            {
                ShowVersion = state.ShowVersion + 1,
                Mode = enabled ? Domain.Shows.ShowMode.Live : Domain.Shows.ShowMode.Editing
            },
            cancellationToken);

        await _hubContext.Clients.All.LiveModeChanged(new LiveModeChangedMessage(result.ShowVersion, result.Mode));
        return result;
    }

    public async Task<ShowStateSnapshot> StartPlaybackAsync(VersionedCommandRequest request, CancellationToken cancellationToken = default)
    {
        var result = await MutateAsync(
            request.ShowVersion,
            ShowRefetchReason.Optimized,
            state =>
            {
                var firstResolve = state.Timeline.FirstOrDefault(eventItem => eventItem.Type == Domain.Shows.TimelineEventType.Res);
                var nextResolve = state.Timeline
                    .SkipWhile(eventItem => eventItem.Id != firstResolve?.Id)
                    .Skip(1)
                    .FirstOrDefault(eventItem => eventItem.Type == Domain.Shows.TimelineEventType.Res);
                var inlineIds = state.Timeline
                    .Where(eventItem => firstResolve is not null && eventItem.Id > firstResolve.Id && eventItem.Id < (nextResolve?.Id ?? int.MaxValue) && eventItem.Type != Domain.Shows.TimelineEventType.Res)
                    .Select(eventItem => eventItem.Id)
                    .ToArray();

                return state with
                {
                    ShowVersion = state.ShowVersion + 1,
                    Playback = new PlaybackState(
                        Domain.Shows.PlaybackStatus.Running,
                        firstResolve?.Id,
                        inlineIds.Length > 0 ? inlineIds[0] : firstResolve?.Id,
                        firstResolve is null
                            ? null
                            : new ActivePlaybackSegment(
                                firstResolve.Id,
                                nextResolve?.Id,
                                inlineIds,
                                0),
                        _timeProvider.GetUtcNow().ToUnixTimeMilliseconds())
                };
            },
            cancellationToken);

        await _hubContext.Clients.All.PlaybackStateChanged(
            new PlaybackStateChangedMessage(result.ShowVersion, result.Playback));

        return result;
    }

    public async Task<ShowStateSnapshot> ResetPlaybackAsync(VersionedCommandRequest request, CancellationToken cancellationToken = default)
    {
        var result = await MutateAsync(
            request.ShowVersion,
            ShowRefetchReason.Optimized,
            state => state with
            {
                ShowVersion = state.ShowVersion + 1,
                Playback = new PlaybackState(Domain.Shows.PlaybackStatus.Idle, null, null, null, null)
            },
            cancellationToken);

        await _hubContext.Clients.All.PlaybackStateChanged(
            new PlaybackStateChangedMessage(result.ShowVersion, result.Playback));

        return result;
    }

    private async Task<ShowStateSnapshot> ReplaceAsync(
        ShowState nextState,
        ShowRefetchReason reason,
        CancellationToken cancellationToken)
    {
        var entity = await LoadEntityAsync(cancellationToken);
        entity.ShowVersion = nextState.ShowVersion;
        entity.PayloadJson = _serializer.Serialize(nextState);
        entity.UpdatedAtUtc = _timeProvider.GetUtcNow();
        await _dbContext.SaveChangesAsync(cancellationToken);

        var snapshot = ShowContractMapper.ToContract(nextState);
        await _hubContext.Clients.All.ShowRefetchRequired(new ShowRefetchRequiredMessage(snapshot.ShowVersion, reason));
        return snapshot;
    }

    private async Task<ShowStateSnapshot> MutateWithoutVersionAsync(
        Func<ShowState, ShowState> mutation,
        CancellationToken cancellationToken)
    {
        var entity = await LoadEntityAsync(cancellationToken);
        var current = _serializer.Deserialize<ShowState>(entity.PayloadJson);
        var updated = mutation(current);

        entity.ShowVersion = updated.ShowVersion;
        entity.PayloadJson = _serializer.Serialize(updated);
        entity.UpdatedAtUtc = _timeProvider.GetUtcNow();

        await _dbContext.SaveChangesAsync(cancellationToken);
        return ShowContractMapper.ToContract(updated);
    }

    private async Task<ShowStateSnapshot> MutateAsync(
        int expectedShowVersion,
        ShowRefetchReason reason,
        Func<ShowState, ShowState> mutation,
        CancellationToken cancellationToken)
    {
        var entity = await LoadEntityAsync(cancellationToken);
        var current = _serializer.Deserialize<ShowState>(entity.PayloadJson);

        if (current.ShowVersion != expectedShowVersion)
        {
            throw new VersionDriftException(expectedShowVersion, current.ShowVersion);
        }

        var updated = mutation(current);
        entity.ShowVersion = updated.ShowVersion;
        entity.PayloadJson = _serializer.Serialize(updated);
        entity.UpdatedAtUtc = _timeProvider.GetUtcNow();

        await _dbContext.SaveChangesAsync(cancellationToken);

        var snapshot = ShowContractMapper.ToContract(updated);
        await _hubContext.Clients.All.ShowRefetchRequired(new ShowRefetchRequiredMessage(snapshot.ShowVersion, reason));
        return snapshot;
    }

    private async Task<ShowState> LoadStateAsync(CancellationToken cancellationToken)
    {
        var entity = await LoadEntityAsync(cancellationToken);
        return _serializer.Deserialize<ShowState>(entity.PayloadJson);
    }

    private async Task<StoredShowState> LoadEntityAsync(CancellationToken cancellationToken)
    {
        await EnsureSeededAsync(cancellationToken);
        var entity = await _dbContext.ShowStates.SingleAsync(row => row.Id == LocalShowId, cancellationToken);
        return entity;
    }

    private ShowState BuildShowFromXml(string xml, int showVersion)
    {
        var contest = IcpcParser.Parse(xml);
        var problemLookup = contest.Problem.ToDictionary(problem => problem.Id, problem => problem.Label);
        var teamLookup = contest.Team.ToDictionary(team => team.Id);
        var teams = contest.Team
            .Select((team, index) => new ContestTeam(
                team.Id,
                team.Name,
                team.Username,
                0,
                index + 1))
            .ToArray();

        var runs = contest.Run
            .Select((run, index) =>
            {
                teamLookup.TryGetValue(run.Team, out var team);
                problemLookup.TryGetValue(run.Problem, out var problemLabel);

                return new TimelineEvent(
                    index + 1,
                    Domain.Shows.TimelineEventType.Res,
                    0,
                    false,
                    null,
                    new ResolveEventPayload(
                        team?.Name ?? $"Team {run.Team}",
                        team?.Username ?? $"team-{run.Team}",
                        problemLabel ?? $"P{run.Problem}",
                        (int)Math.Round(run.Score, MidpointRounding.AwayFromZero),
                        index + 1),
                    null,
                    null);
            })
            .ToArray();

        return CreateEmptyShow(showVersion, Domain.Shows.ShowSource.Xml) with
        {
            Meta = new ShowMeta(contest.Info.Title, contest.Info.ContestId, Domain.Shows.ShowSource.Xml),
            Contest = new ContestState(
                ParseDurationSeconds(contest.Info.Length),
                ParseDurationSeconds(contest.Info.ScoreboardFreezeLength),
                teams),
            Timeline = runs.Length > 0 ? runs : CreateSeededShow().Timeline
        };
    }

    private static ShowState CreateSeededShow()
    {
        return CreateEmptyShow(1, Domain.Shows.ShowSource.Manual) with
        {
            Meta = new ShowMeta("Local Show", "local-show", Domain.Shows.ShowSource.Manual),
            Contest = new ContestState(
                18_000,
                3_600,
                new[]
                {
                    new ContestTeam(1, "Alice Team", "alice", 100, 1),
                    new ContestTeam(2, "Bob Team", "bob", 80, 2)
                }),
            Timeline = new[]
            {
                new TimelineEvent(
                    1,
                    Domain.Shows.TimelineEventType.Res,
                    0,
                    false,
                    null,
                    new ResolveEventPayload("Alice Team", "alice", "A", 100, 1),
                    null,
                    null),
                new TimelineEvent(
                    2,
                    Domain.Shows.TimelineEventType.Sfx,
                    0.5,
                    false,
                    "Opening Sting",
                    null,
                    null,
                    new MediaEventPayload("sting", 2.5)),
                new TimelineEvent(
                    3,
                    Domain.Shows.TimelineEventType.Img,
                    1,
                    false,
                    "Title Board",
                    null,
                    new MediaEventPayload("award-board", 5),
                    null),
                new TimelineEvent(
                    4,
                    Domain.Shows.TimelineEventType.Res,
                    0,
                    false,
                    "Bob Reveal",
                    new ResolveEventPayload("Bob Team", "bob", "B", 180, 2),
                    null,
                    null)
            }
        };
    }

    private static ShowState CreateEmptyShow(int showVersion, Domain.Shows.ShowSource source)
    {
        return new ShowState(
            CurrentSchemaVersion,
            showVersion,
            Domain.Shows.ShowMode.Editing,
            new ShowMeta("Untitled show", null, source),
            new ContestState(0, 0, Array.Empty<ContestTeam>()),
            new AutomationState(false, 3_000, false),
            new PlaybackState(Domain.Shows.PlaybackStatus.Idle, null, null, null, null),
            new AssetCollection(
                new[]
                {
                    new ShowAsset("award-board", "image", "award-board.png", "award-board.png", "image/png", 0, "award-board")
                },
                new[]
                {
                    new ShowAsset("sting", "sfx", "sting.mp3", "sting.mp3", "audio/mpeg", 0, "sting")
                }),
            Array.Empty<TimelineEvent>());
    }

    private static int ParseDurationSeconds(string value)
    {
        return TimeSpan.TryParse(value, out var duration)
            ? (int)duration.TotalSeconds
            : 0;
    }
}
