using System.Text.Json;
using FastEndpoints;
using TGB.Resolver.IcpcXmlParser;
using IcpcParser = TGB.Resolver.IcpcXmlParser.IcpcXmlParser;
using TGB.Resolver.Server.Features.Show.Dto;

namespace TGB.Resolver.Server.Features.Show;

public sealed class GetShowEndpoint(ShowStateService showStateService)
  : EndpointWithoutRequest<ShowStateSnapshot>
{
  public override void Configure()
  {
    Get("/timeline");
    AllowAnonymous();
  }

  public override async Task HandleAsync(CancellationToken ct)
  {
    await Send.OkAsync(await showStateService.GetSnapshotAsync(ct), ct);
  }
}

public sealed class OptimizeShowEndpoint(ShowStateService showStateService)
  : Endpoint<VersionedCommandRequest, ShowStateSnapshot>
{
  public override void Configure()
  {
    Post("/api/show/optimize");
    AllowAnonymous();
  }

  public override async Task HandleAsync(VersionedCommandRequest request, CancellationToken ct)
  {
    await Send.OkAsync(await showStateService.OptimizeAsync(request, ct), ct);
  }
}

public sealed class ClearShowEndpoint(ShowStateService showStateService)
  : Endpoint<VersionedCommandRequest, ShowStateSnapshot>
{
  public override void Configure()
  {
    Post("/api/show/clear");
    AllowAnonymous();
  }

  public override async Task HandleAsync(VersionedCommandRequest request, CancellationToken ct)
  {
    await Send.OkAsync(await showStateService.ClearAsync(request, ct), ct);
  }
}

public sealed class ImportXmlEndpoint(ShowStateService showStateService)
  : Endpoint<ImportXmlRequest, ShowStateSnapshot>
{
  public override void Configure()
  {
    Post("/import/xml");
    AllowAnonymous();
  }

  public override async Task HandleAsync(ImportXmlRequest request, CancellationToken ct)
  {
    try
    {
      await Send.OkAsync(await showStateService.ImportXmlAsync(request, ct), ct);
    }
    catch (InvalidOperationException exception)
    {
      // Malformed XML, missing elements, or a run-id monotonicity violation
      // from the ICPC parser/engine all surface here as user input errors.
      AddError(exception.Message);
      ThrowIfAnyErrors();
    }
  }
}

public sealed class ImportBundleEndpoint(ShowStateService showStateService)
  : Endpoint<ImportBundleRequest, ShowStateSnapshot>
{
  public override void Configure()
  {
    Post("/import/bundle");
    AllowAnonymous();
  }

  public override async Task HandleAsync(ImportBundleRequest request, CancellationToken ct)
  {
    try
    {
      await Send.OkAsync(await showStateService.ImportBundleAsync(request, ct), ct);
    }
    catch (Exception exception)
      when (exception is FormatException
              or InvalidDataException
              or InvalidOperationException
              or JsonException)
    {
      // Bad base64, corrupt zip, missing/hash-mismatched entries, or an
      // unreadable show.json are all user input errors.
      AddError(exception.Message);
      ThrowIfAnyErrors();
    }
  }
}

public sealed class ImportXmlUsersEndpoint
  : Endpoint<ImportXmlUsersRequest, IReadOnlyList<ImportXmlUser>>
{
  public override void Configure()
  {
    Post("/import/xml/users");
    AllowAnonymous();
  }

  public override async Task HandleAsync(ImportXmlUsersRequest request, CancellationToken ct)
  {
    try
    {
      var contest = IcpcParser.Parse(request.Xml);
      var users = contest.Team
        .OrderBy(team => team.Id)
        .Select(team => new ImportXmlUser(team.Id, team.Username, team.Name))
        .ToList();
      await Send.OkAsync(users, ct);
    }
    catch (InvalidOperationException exception)
    {
      // Malformed XML or missing elements from the ICPC parser surface as a
      // user input error, mirroring ImportXmlEndpoint.
      AddError(exception.Message);
      ThrowIfAnyErrors();
    }
  }
}

public sealed class ExportBundleEndpoint(ShowStateService showStateService) : EndpointWithoutRequest
{
  public override void Configure()
  {
    Get("/export/bundle");
    AllowAnonymous();
  }

  public override async Task HandleAsync(CancellationToken ct)
  {
    var bytes = await showStateService.ExportBundleAsync(ct);
    HttpContext.Response.ContentType = "application/octet-stream";
    HttpContext.Response.Headers.ContentDisposition = "attachment; filename=\"show.tgbresolver\"";
    await HttpContext.Response.Body.WriteAsync(bytes, ct);
  }
}

public sealed class RenameResolveEventEndpoint(ShowStateService showStateService)
  : Endpoint<ResolveEventRenameRequest, ShowStateSnapshot>
{
  public override void Configure()
  {
    Patch("/api/show/events/resolve/{id:int}");
    AllowAnonymous();
  }

  public override async Task HandleAsync(ResolveEventRenameRequest request, CancellationToken ct)
  {
    var eventId = Route<int>("id");
    await Send.OkAsync(await showStateService.RenameResolveEventAsync(eventId, request, ct), ct);
  }
}

public sealed class PatchNonResolveEventEndpoint(ShowStateService showStateService)
  : Endpoint<NonResolveEventPatchRequest, ShowStateSnapshot>
{
  public override void Configure()
  {
    Patch("/api/show/events/non-resolve/{id:int}");
    AllowAnonymous();
  }

  public override async Task HandleAsync(NonResolveEventPatchRequest request, CancellationToken ct)
  {
    var eventId = Route<int>("id");
    await Send.OkAsync(await showStateService.PatchNonResolveEventAsync(eventId, request, ct), ct);
  }
}

public sealed class EnableLiveModeEndpoint(ShowStateService showStateService)
  : EndpointWithoutRequest<ShowStateSnapshot>
{
  public override void Configure()
  {
    Post("/api/show/live");
    AllowAnonymous();
  }

  public override async Task HandleAsync(CancellationToken ct)
  {
    await Send.OkAsync(await showStateService.SetLiveModeAsync(true, ct), ct);
  }
}

public sealed class DisableLiveModeEndpoint(ShowStateService showStateService)
  : EndpointWithoutRequest<ShowStateSnapshot>
{
  public override void Configure()
  {
    Delete("/api/show/live");
    AllowAnonymous();
  }

  public override async Task HandleAsync(CancellationToken ct)
  {
    await Send.OkAsync(await showStateService.SetLiveModeAsync(false, ct), ct);
  }
}