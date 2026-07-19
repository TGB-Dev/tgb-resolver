using System.Text.Json.Serialization;
using TGB.Resolver.Server.Commons.Data;
using TGB.Resolver.Server.Features.Realtime;
using TGB.Resolver.Server.Features.Show.Data;
using TGB.Resolver.Server.Features.Show.Dto;

namespace TGB.Resolver.Server.Commons.Serialization;

[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull)]
[JsonSerializable(typeof(ShowState))]
[JsonSerializable(typeof(ProblemDefinition))]
[JsonSerializable(typeof(UserDefinition))]
[JsonSerializable(typeof(FreezeSnapshotEntry))]
[JsonSerializable(typeof(ProblemFreezeResult))]
[JsonSerializable(typeof(ShowStateSnapshot))]
[JsonSerializable(typeof(PlaybackStateSnapshot))]
[JsonSerializable(typeof(TimelineEventSnapshot))]
[JsonSerializable(typeof(StoredShowState))]
[JsonSerializable(typeof(ClockSyncRequest))]
[JsonSerializable(typeof(ClockSyncResponse))]
[JsonSerializable(typeof(VersionedCommandRequest))]
[JsonSerializable(typeof(ResolveEventRenameRequest))]
[JsonSerializable(typeof(NonResolveEventPatchRequest))]
[JsonSerializable(typeof(ImportXmlRequest))]
[JsonSerializable(typeof(ImportBundleRequest))]
[JsonSerializable(typeof(ShowReplacedMessage))]
[JsonSerializable(typeof(TimelineEventAddedMessage))]
[JsonSerializable(typeof(TimelineEventUpdatedMessage))]
[JsonSerializable(typeof(TimelineEventRemovedMessage))]
[JsonSerializable(typeof(TimelineReorderedMessage))]
[JsonSerializable(typeof(PlaybackStateChangedMessage))]
[JsonSerializable(typeof(LiveModeChangedMessage))]
public partial class AppJsonSerializerContext : JsonSerializerContext;