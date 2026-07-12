using System.Text.Json;
using TGB.Resolver.IcpcXmlParser;
using TGB.Resolver.Server.Commons.Serialization;
using TGB.Resolver.Server.Commons.Types;
using TGB.Resolver.Server.Features.Show.Dto;

namespace TGB.Resolver.Server.Tests.Application;

public sealed class AppJsonSerializerTests
{
  [Test]
  public async Task Serialize_UsesGeneratedContextForKnownTypes()
  {
    var serializer = new AppJsonSerializer(AppJsonSerializerContext.Default);
    var payload = new ShowStateSnapshot(
      1,
      3,
      ShowMode.Live,
      TimelineMode.Rw,
      new ShowMetaSnapshot("Demo Show", "demo-show", ShowSource.Manual),
      new ContestSnapshot(18_000, 3_600, []),
      new AutomationSnapshot(false, 3_000, false),
      new PlaybackStateSnapshot(PlaybackStatus.Running, 1, 1, null, 120_000, 1),
      new AssetCollectionSnapshot([], []),
      [
        new TimelineEventSnapshot(1, 1, TimelineEventType.Res, 0, false, "Intro",
          new ResolveEventPayloadSnapshot("Alice", "alice", "A", 100, 1, 0, "",
            VerdictRunResult.Accepted), null, null)
      ]);

    var json = serializer.Serialize(payload);

    using var document = JsonDocument.Parse(json);
    await Assert.That(document.RootElement.GetProperty("showVersion").GetInt32()).IsEqualTo(3);
    await Assert.That(document.RootElement.GetProperty("meta").GetProperty("title").GetString())
      .IsEqualTo("Demo Show");
    await Assert
      .That(document.RootElement.GetProperty("playback").GetProperty("status").GetString())
      .IsEqualTo("Running");
  }

  [Test]
  public async Task SerializeUnknown_FallsBackToRuntimeTypeSerialization()
  {
    var serializer = new AppJsonSerializer(AppJsonSerializerContext.Default);
    object payload = new Dictionary<string, object?>
    {
      ["type"] = "opaque",
      ["revision"] = 3
    };

    var json = serializer.SerializeUnknown(payload);

    using var document = JsonDocument.Parse(json);
    await Assert.That(document.RootElement.GetProperty("type").GetString()).IsEqualTo("opaque");
    await Assert.That(document.RootElement.GetProperty("revision").GetInt32()).IsEqualTo(3);
  }
}