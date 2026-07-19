using FastEndpoints;
using TGB.Resolver.Server.Features.Show.Dto;

namespace TGB.Resolver.Server.Features.Show;

public sealed class SetAutomationEndpoint(ShowStateService showStateService)
  : Endpoint<SetAutomationRequest, ShowStateSnapshot>
{
  public override void Configure()
  {
    Patch("/api/show/automation");
    AllowAnonymous();
  }

  public override async Task HandleAsync(SetAutomationRequest request, CancellationToken ct)
  {
    await Send.OkAsync(await showStateService.SetAutomationAsync(request, ct), ct);
  }
}