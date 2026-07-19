using FastEndpoints;
using TGB.Resolver.Server.Features.Show.Dto;

namespace TGB.Resolver.Server.Features.Show;

public sealed class CreateTimelineEventEndpoint(ShowStateService showStateService)
    : Endpoint<CreateTimelineEventRequest, ShowStateSnapshot>
{
    public override void Configure()
    {
        Post("/timeline/event");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CreateTimelineEventRequest request, CancellationToken ct)
    {
        await Send.OkAsync(await showStateService.CreateNonResolveEventAsync(request, ct), ct);
    }
}

public sealed class MoveTimelineEventEndpoint(ShowStateService showStateService)
    : Endpoint<MoveTimelineEventRequest, ShowStateSnapshot>
{
    public override void Configure()
    {
        Patch("/timeline/event/{id:int}/position");
        AllowAnonymous();
    }

    public override async Task HandleAsync(MoveTimelineEventRequest request, CancellationToken ct)
    {
        await Send.OkAsync(
            await showStateService.MoveNonResolveEventAsync(Route<int>("id"), request, ct), ct);
    }
}

public sealed class PatchTimelineEventEndpoint(ShowStateService showStateService)
    : Endpoint<PatchTimelineEventRequest, ShowStateSnapshot>
{
    public override void Configure()
    {
        Patch("/timeline/event/{id:int}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(PatchTimelineEventRequest request, CancellationToken ct)
    {
        await Send.OkAsync(
            await showStateService.PatchTimelineEventAsync(Route<int>("id"), request, ct), ct);
    }
}

public sealed class DeleteTimelineEventEndpoint(ShowStateService showStateService)
    : Endpoint<VersionedCommandRequest, ShowStateSnapshot>
{
    public override void Configure()
    {
        Delete("/timeline/event/{id:int}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(VersionedCommandRequest request, CancellationToken ct)
    {
        await Send.OkAsync(
            await showStateService.DeleteNonResolveEventAsync(Route<int>("id"), request, ct), ct);
    }
}

public sealed class SetTimelineModeEndpoint(ShowStateService showStateService)
    : Endpoint<SetTimelineModeRequest, ShowStateSnapshot>
{
    public override void Configure()
    {
        Patch("/timeline/mode");
        AllowAnonymous();
    }

    public override async Task HandleAsync(SetTimelineModeRequest request, CancellationToken ct)
    {
        await Send.OkAsync(await showStateService.SetTimelineModeAsync(request, ct), ct);
    }
}