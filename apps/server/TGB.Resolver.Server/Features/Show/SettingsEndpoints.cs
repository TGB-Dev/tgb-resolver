using FastEndpoints;
using TGB.Resolver.Server.Features.Show.Dto;

namespace TGB.Resolver.Server.Features.Show;

public sealed class SetSettingsEndpoint(ShowStateService showStateService)
  : Endpoint<SetSettingsRequest, ShowStateSnapshot>
{
  public override void Configure()
  {
    Patch("/api/show/settings");
    AllowAnonymous();
  }

  public override async Task HandleAsync(SetSettingsRequest request, CancellationToken ct)
  {
    await Send.OkAsync(await showStateService.SetSettingsAsync(request, ct), ct);
  }
}
