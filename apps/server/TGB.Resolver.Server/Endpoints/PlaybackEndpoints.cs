using FastEndpoints;
using TGB.Resolver.Server.Application.Shows;
using TGB.Resolver.Server.Contracts.Playback;
using TGB.Resolver.Server.Contracts.Show;

namespace TGB.Resolver.Server.Endpoints;

public sealed class StartPlaybackEndpoint : Endpoint<VersionedCommandRequest, ShowStateSnapshot>
{
    private readonly IShowStateService _showStateService;

    public StartPlaybackEndpoint(IShowStateService showStateService)
    {
        _showStateService = showStateService;
    }

    public override void Configure()
    {
        Post("/api/playback/start");
        AllowAnonymous();
    }

    public override async Task HandleAsync(VersionedCommandRequest request, CancellationToken ct)
    {
        await Send.OkAsync(await _showStateService.StartPlaybackAsync(request, ct), ct);
    }
}

public sealed class ResetPlaybackEndpoint : Endpoint<VersionedCommandRequest, ShowStateSnapshot>
{
    private readonly IShowStateService _showStateService;

    public ResetPlaybackEndpoint(IShowStateService showStateService)
    {
        _showStateService = showStateService;
    }

    public override void Configure()
    {
        Post("/api/playback/reset");
        AllowAnonymous();
    }

    public override async Task HandleAsync(VersionedCommandRequest request, CancellationToken ct)
    {
        await Send.OkAsync(await _showStateService.ResetPlaybackAsync(request, ct), ct);
    }
}
