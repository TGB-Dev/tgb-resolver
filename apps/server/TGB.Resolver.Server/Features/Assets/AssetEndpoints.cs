using FastEndpoints;
using TGB.Resolver.Server.Features.Show;
using TGB.Resolver.Server.Features.Show.Dto;

namespace TGB.Resolver.Server.Features.Assets;

public sealed class GetAssetEndpoint(AssetStore assetStore) : EndpointWithoutRequest
{
  public override void Configure()
  {
    Get("/assets/{id}");
    AllowAnonymous();
  }

  public override async Task HandleAsync(CancellationToken ct)
  {
    var asset = await assetStore.ReadAsync(Route<string>("id") ?? string.Empty, ct);
    await Send.BytesAsync(asset.Bytes, "application/octet-stream", cancellation: ct);
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

public sealed class DeleteAssetEndpoint(AssetStore assetStore, ShowStateService showStateService)
  : Endpoint<VersionedCommandRequest, ShowStateSnapshot>
{
  public override void Configure()
  {
    Delete("/assets/{id}");
    AllowAnonymous();
  }

  public override async Task HandleAsync(VersionedCommandRequest request, CancellationToken ct)
  {
    var assetId = Route<string>("id") ?? string.Empty;
    await assetStore.DeleteAsync(assetId);
    await Send.OkAsync(await showStateService.DeleteAssetAsync(assetId, request, ct), ct);
  }
}