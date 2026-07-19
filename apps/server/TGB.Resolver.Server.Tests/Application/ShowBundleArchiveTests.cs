using System.IO.Compression;
using System.Text;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Hosting;
using NSubstitute;
using TGB.Resolver.Server.Commons.Serialization;
using TGB.Resolver.Server.Commons.Types;
using TGB.Resolver.Server.Features.Assets;
using TGB.Resolver.Server.Features.Show.Data;
using TGB.Resolver.Server.Features.Show.Exporting;

namespace TGB.Resolver.Server.Tests.Application;

public sealed class ShowBundleArchiveTests
{
  [Test]
  public async Task UnpackAsync_NormalizesMissingContestMapsFromLegacyBundle()
  {
    var serializer = new AppJsonSerializer(AppJsonSerializerContext.Default);
    var assetStore = CreateAssetStore();

    var show = ShowRawRepository.CreateEmptyShow(1, ShowSource.Manual);
    var json = serializer.Serialize(show);

    var node = JsonNode.Parse(json)!.AsObject();
    var contest = node["contest"]!.AsObject();
    contest.Remove("problems");
    contest.Remove("users");
    contest.Remove("preFreezeSnapshot");
    var legacyJson = node.ToJsonString();

    using var stream = new MemoryStream();
    await using (var archive = new ZipArchive(stream, ZipArchiveMode.Create, true))
    {
      var entry = archive.CreateEntry("show.json");
      await using var entryStream = await entry.OpenAsync(CancellationToken.None);
      entryStream.Write(Encoding.UTF8.GetBytes(legacyJson));
    }

    var imported = await ShowBundleArchive.UnpackAsync(stream.ToArray(), serializer, assetStore);

    await Assert.That(imported.Contest.Problems).IsNotNull();
    await Assert.That(imported.Contest.Users).IsNotNull();
    await Assert.That(imported.Contest.PreFreezeSnapshot).IsNotNull();

    // Mapping must not NRE on the normalized state.
    var snapshot = ShowContractMapper.ToContract(imported);
    await Assert.That(snapshot.Contest.Problems).IsEmpty();
    await Assert.That(snapshot.Contest.Users).IsEmpty();
  }

  private static AssetStore CreateAssetStore()
  {
    var environment = Substitute.For<IHostEnvironment>();
    environment.ContentRootPath.Returns(Path.GetTempPath());
    return new AssetStore(environment);
  }
}