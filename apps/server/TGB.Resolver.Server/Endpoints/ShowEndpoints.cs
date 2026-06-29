using FastEndpoints;
using TGB.Resolver.Server.Application.Shows;
using TGB.Resolver.Server.Contracts.Commands;
using TGB.Resolver.Server.Contracts.Playback;
using TGB.Resolver.Server.Contracts.Show;

namespace TGB.Resolver.Server.Endpoints;

public sealed class GetShowEndpoint : EndpointWithoutRequest<ShowStateSnapshot>
{
    private readonly IShowStateService _showStateService;

    public GetShowEndpoint(IShowStateService showStateService)
    {
        _showStateService = showStateService;
    }

    public override void Configure()
    {
        Get("/api/show");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await Send.OkAsync(await _showStateService.GetSnapshotAsync(ct), ct);
    }
}

public sealed class OptimizeShowEndpoint : Endpoint<VersionedCommandRequest, ShowStateSnapshot>
{
    private readonly IShowStateService _showStateService;

    public OptimizeShowEndpoint(IShowStateService showStateService)
    {
        _showStateService = showStateService;
    }

    public override void Configure()
    {
        Post("/api/show/optimize");
        AllowAnonymous();
    }

    public override async Task HandleAsync(VersionedCommandRequest request, CancellationToken ct)
    {
        await Send.OkAsync(await _showStateService.OptimizeAsync(request, ct), ct);
    }
}

public sealed class ClearShowEndpoint : Endpoint<VersionedCommandRequest, ShowStateSnapshot>
{
    private readonly IShowStateService _showStateService;

    public ClearShowEndpoint(IShowStateService showStateService)
    {
        _showStateService = showStateService;
    }

    public override void Configure()
    {
        Post("/api/show/clear");
        AllowAnonymous();
    }

    public override async Task HandleAsync(VersionedCommandRequest request, CancellationToken ct)
    {
        await Send.OkAsync(await _showStateService.ClearAsync(request, ct), ct);
    }
}

public sealed class ImportXmlEndpoint : Endpoint<ImportXmlRequest, ShowStateSnapshot>
{
    private readonly IShowStateService _showStateService;

    public ImportXmlEndpoint(IShowStateService showStateService)
    {
        _showStateService = showStateService;
    }

    public override void Configure()
    {
        Post("/api/show/import/xml");
        AllowAnonymous();
    }

    public override async Task HandleAsync(ImportXmlRequest request, CancellationToken ct)
    {
        await Send.OkAsync(await _showStateService.ImportXmlAsync(request, ct), ct);
    }
}

public sealed class ImportBundleEndpoint : Endpoint<ImportBundleRequest, ShowStateSnapshot>
{
    private readonly IShowStateService _showStateService;

    public ImportBundleEndpoint(IShowStateService showStateService)
    {
        _showStateService = showStateService;
    }

    public override void Configure()
    {
        Post("/api/show/import/bundle");
        AllowAnonymous();
    }

    public override async Task HandleAsync(ImportBundleRequest request, CancellationToken ct)
    {
        await Send.OkAsync(await _showStateService.ImportBundleAsync(request, ct), ct);
    }
}

public sealed class ExportBundleEndpoint : EndpointWithoutRequest
{
    private readonly IShowStateService _showStateService;

    public ExportBundleEndpoint(IShowStateService showStateService)
    {
        _showStateService = showStateService;
    }

    public override void Configure()
    {
        Get("/api/show/export/bundle");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var bytes = await _showStateService.ExportBundleAsync(ct);
        HttpContext.Response.ContentType = "application/octet-stream";
        HttpContext.Response.Headers.ContentDisposition = "attachment; filename=\"show.tgbresolver\"";
        await HttpContext.Response.Body.WriteAsync(bytes, ct);
    }
}

public sealed class RenameResolveEventEndpoint : Endpoint<ResolveEventRenameRequest, ShowStateSnapshot>
{
    private readonly IShowStateService _showStateService;

    public RenameResolveEventEndpoint(IShowStateService showStateService)
    {
        _showStateService = showStateService;
    }

    public override void Configure()
    {
        Patch("/api/show/events/resolve/{id:int}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(ResolveEventRenameRequest request, CancellationToken ct)
    {
        var eventId = Route<int>("id");
        await Send.OkAsync(await _showStateService.RenameResolveEventAsync(eventId, request, ct), ct);
    }
}

public sealed class PatchNonResolveEventEndpoint : Endpoint<NonResolveEventPatchRequest, ShowStateSnapshot>
{
    private readonly IShowStateService _showStateService;

    public PatchNonResolveEventEndpoint(IShowStateService showStateService)
    {
        _showStateService = showStateService;
    }

    public override void Configure()
    {
        Patch("/api/show/events/non-resolve/{id:int}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(NonResolveEventPatchRequest request, CancellationToken ct)
    {
        var eventId = Route<int>("id");
        await Send.OkAsync(await _showStateService.PatchNonResolveEventAsync(eventId, request, ct), ct);
    }
}

public sealed class EnableLiveModeEndpoint : EndpointWithoutRequest<ShowStateSnapshot>
{
    private readonly IShowStateService _showStateService;

    public EnableLiveModeEndpoint(IShowStateService showStateService)
    {
        _showStateService = showStateService;
    }

    public override void Configure()
    {
        Post("/api/show/live");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await Send.OkAsync(await _showStateService.SetLiveModeAsync(true, ct), ct);
    }
}

public sealed class DisableLiveModeEndpoint : EndpointWithoutRequest<ShowStateSnapshot>
{
    private readonly IShowStateService _showStateService;

    public DisableLiveModeEndpoint(IShowStateService showStateService)
    {
        _showStateService = showStateService;
    }

    public override void Configure()
    {
        Delete("/api/show/live");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await Send.OkAsync(await _showStateService.SetLiveModeAsync(false, ct), ct);
    }
}
