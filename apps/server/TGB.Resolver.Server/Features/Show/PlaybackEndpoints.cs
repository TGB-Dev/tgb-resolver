using FastEndpoints;
using TGB.Resolver.Server.Features.Show.Dto;

namespace TGB.Resolver.Server.Features.Show;

public sealed class StartPlaybackEndpoint(ShowStateService showStateService)
  : Endpoint<VersionedCommandRequest, ShowStateSnapshot>
{
  public override void Configure()
  {
    Post("/api/playback/start");
    AllowAnonymous();
  }

  public override async Task HandleAsync(VersionedCommandRequest request, CancellationToken ct)
  {
    await Send.OkAsync(await showStateService.StartPlaybackAsync(request, ct), ct);
  }
}

public sealed class ResetPlaybackEndpoint(ShowStateService showStateService)
  : Endpoint<VersionedCommandRequest, ShowStateSnapshot>
{
  public override void Configure()
  {
    Post("/api/playback/reset");
    AllowAnonymous();
  }

  public override async Task HandleAsync(VersionedCommandRequest request, CancellationToken ct)
  {
    await Send.OkAsync(await showStateService.ResetPlaybackAsync(request, ct), ct);
  }
}

public sealed class SeekPlaybackEndpoint(ShowStateService showStateService)
  : Endpoint<SeekPlaybackRequest, ShowStateSnapshot>
{
  public override void Configure()
  {
    Post("/playback/seek");
    AllowAnonymous();
  }

  public override async Task HandleAsync(SeekPlaybackRequest request, CancellationToken ct)
  {
    await Send.OkAsync(await showStateService.SeekPlaybackAsync(request, ct), ct);
  }
}