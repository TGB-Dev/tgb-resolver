using FastEndpoints;
using TGB.Resolver.Server.Features.Show;
using TGB.Resolver.Server.Features.Show.Dto;

namespace TGB.Resolver.Server.Features.Assets;

public sealed class GetAssetEndpoint(AssetStore assetStore, ShowStateService showStateService)
  : EndpointWithoutRequest
{
  public override void Configure()
  {
    Get("/assets/{id}");
    AllowAnonymous();
  }

  public override async Task HandleAsync(CancellationToken ct)
  {
    var assetId = Route<string>("id") ?? string.Empty;
    var bytes = await assetStore.ReadAsync(assetId, ct);
    var snapshot = await showStateService.GetSnapshotAsync(ct);
    var contentType = snapshot.Assets.Items
      .FirstOrDefault(a => a.Id == assetId)
      ?.ContentType ?? "application/octet-stream";
    await Send.BytesAsync(bytes, contentType, cancellation: ct);
  }
}

public sealed class PutAssetEndpoint(AssetStore assetStore, ShowStateService showStateService)
  : Endpoint<UpsertAssetRequest, ShowStateSnapshot>
{
  public override void Configure()
  {
    Post("/assets/{id}");
    AllowAnonymous();
  }

  public override async Task HandleAsync(UpsertAssetRequest request, CancellationToken ct)
  {
    var assetId = Route<string>("id") ?? string.Empty;
    await assetStore.SaveAsync(assetId, Convert.FromBase64String(request.Bytes), ct);
    await Send.OkAsync(await showStateService.UpsertAssetAsync(assetId, request, ct), ct);
  }
}

public sealed class CreateFolderEndpoint(ShowStateService showStateService)
  : Endpoint<CreateFolderRequest, ShowStateSnapshot>
{
  public override void Configure()
  {
    Post("/assets/folders");
    AllowAnonymous();
  }

  public override async Task HandleAsync(CreateFolderRequest request, CancellationToken ct)
  {
    await Send.OkAsync(await showStateService.CreateFolderAsync(request, ct), ct);
  }
}

public sealed class DeleteEntryEndpoint(AssetStore assetStore, ShowStateService showStateService)
  : Endpoint<DeleteEntryRequest, ShowStateSnapshot>
{
  public override void Configure()
  {
    Delete("/assets/entries/{id}");
    AllowAnonymous();
  }

  public override async Task HandleAsync(DeleteEntryRequest request, CancellationToken ct)
  {
    var entryId = Route<string>("id") ?? string.Empty;
    if (!request.IsDirectory)
      await assetStore.DeleteAsync(entryId);
    await Send.OkAsync(await showStateService.DeleteEntryAsync(request with { Id = entryId }, ct), ct);
  }
}

public sealed class RenameEntryEndpoint(ShowStateService showStateService)
  : Endpoint<RenameEntryRequest, ShowStateSnapshot>
{
  public override void Configure()
  {
    Patch("/assets/entries/{id}");
    AllowAnonymous();
  }

  public override async Task HandleAsync(RenameEntryRequest request, CancellationToken ct)
  {
    var entryId = Route<string>("id") ?? string.Empty;
    await Send.OkAsync(await showStateService.RenameEntryAsync(request with { Id = entryId }, ct), ct);
  }
}

public sealed class MoveAssetEndpoint(ShowStateService showStateService)
  : Endpoint<MoveAssetRequest, ShowStateSnapshot>
{
  public override void Configure()
  {
    Patch("/assets/{assetId}/move");
    AllowAnonymous();
  }

  public override async Task HandleAsync(MoveAssetRequest request, CancellationToken ct)
  {
    await Send.OkAsync(await showStateService.MoveAssetAsync(request, ct), ct);
  }
}