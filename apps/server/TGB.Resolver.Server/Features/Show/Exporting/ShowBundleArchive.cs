using System.IO.Compression;
using System.IO.Hashing;
using System.Text;
using TGB.Resolver.Server.Commons.Serialization;
using TGB.Resolver.Server.Features.Assets;
using TGB.Resolver.Server.Features.Show.Data;

namespace TGB.Resolver.Server.Features.Show.Exporting;

/// <summary>
///   Packs a show and its on-disk assets into a portable bundle: a zip archive
///   containing <c>show.json</c> plus every asset under <c>assets/{kind}/{id}</c>.
///   The inverse <see cref="UnpackAsync" /> restores the assets and returns the show.
/// </summary>
public static class ShowBundleArchive
{
  private const string ShowJsonEntryName = "show.json";
  private const string AssetFolder = "assets";

  public static async Task<byte[]> PackAsync(
    ShowState state,
    AppJsonSerializer serializer,
    AssetStore assetStore,
    CancellationToken cancellationToken = default)
  {
    var showJson = serializer.Serialize(state);
    using var output = new MemoryStream();
    await using (var archive = new ZipArchive(output, ZipArchiveMode.Create, true))
    {
      await WriteEntryAsync(archive, ShowJsonEntryName, Encoding.UTF8.GetBytes(showJson),
        cancellationToken);
      foreach (var asset in state.Assets.Items)
      {
        try
        {
          await PackAssetAsync(archive, assetStore, asset, cancellationToken);
        }
        catch (FileNotFoundException)
        {
          // Ignore missing assets so the bundle can still be generated successfully
        }
      }
    }

    return output.ToArray();
  }

  public static async Task<ShowState> UnpackAsync(
    byte[] bundle,
    AppJsonSerializer serializer,
    AssetStore assetStore,
    CancellationToken cancellationToken = default)
  {
    using var input = new MemoryStream(bundle);
    await using var archive = new ZipArchive(input, ZipArchiveMode.Read);

    var showEntry = archive.GetEntry(ShowJsonEntryName)
                    ?? throw new InvalidOperationException(
                      "Bundle is missing the show.json entry.");
    string showJson;
    await using (var entryStream = await showEntry.OpenAsync(cancellationToken))
    using (var reader = new StreamReader(entryStream, Encoding.UTF8))
    {
      showJson = await reader.ReadToEndAsync(cancellationToken);
    }

    var show = serializer.Deserialize<ShowState>(showJson);
    var assetById = show.Assets.Items.ToDictionary(a => a.Id);

    foreach (var entry in archive.Entries)
    {
      if (!TryGetAssetId(entry.FullName, out var assetId)) continue;
      await using var entryStream = await entry.OpenAsync(cancellationToken);
      using var buffer = new MemoryStream();
      await entryStream.CopyToAsync(buffer, cancellationToken);
      var bytes = buffer.ToArray();
      if (assetById.TryGetValue(assetId, out var meta))
      {
        var actualHash = Convert.ToHexString(XxHash3.Hash(bytes));
        if (!string.Equals(actualHash, meta.Xxh3, StringComparison.OrdinalIgnoreCase))
          throw new InvalidOperationException(
            $"Asset {assetId} hash mismatch: expected {meta.Xxh3}, got {actualHash}.");
      }

      await assetStore.SaveAsync(assetId, bytes, cancellationToken);
    }

    return ShowStateNormalizer.Normalize(show);
  }

  private static async Task PackAssetAsync(
    ZipArchive archive, AssetStore assetStore, ShowAsset asset, CancellationToken cancellationToken)
  {
    var bytes = await assetStore.ReadAsync(asset.Id, cancellationToken);
    var category = asset.ContentType.Split('/')[0];
    var entry = archive.CreateEntry($"{AssetFolder}/{category}/{asset.Id}");
    await using var entryStream = await entry.OpenAsync(cancellationToken);
    await entryStream.WriteAsync(bytes, cancellationToken);
  }

  private static async Task WriteEntryAsync(
    ZipArchive archive, string name, byte[] bytes, CancellationToken cancellationToken)
  {
    var entry = archive.CreateEntry(name);
    await using var entryStream = await entry.OpenAsync(cancellationToken);
    await entryStream.WriteAsync(bytes, cancellationToken);
  }

  private static bool TryGetAssetId(string fullName, out string assetId)
  {
    assetId = string.Empty;
    var segments = fullName.Split('/');
    if (segments.Length != 3
        || segments[0] != AssetFolder
        || string.IsNullOrWhiteSpace(segments[2]))
      return false;

    assetId = segments[2];
    return true;
  }
}