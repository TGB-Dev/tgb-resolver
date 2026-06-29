using System.Text.Json.Serialization;
using TGB.Resolver.Server.Contracts.Clock;
using TGB.Resolver.Server.Contracts.Commands;
using TGB.Resolver.Server.Contracts.Playback;
using TGB.Resolver.Server.Contracts.Realtime;
using TGB.Resolver.Server.Contracts.Show;
using TGB.Resolver.Server.Domain.Shows;

namespace TGB.Resolver.Server.Application.Serialization;

[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull)]
[JsonSerializable(typeof(ShowState))]
[JsonSerializable(typeof(ShowStateSnapshot))]
[JsonSerializable(typeof(PlaybackStateSnapshot))]
[JsonSerializable(typeof(TimelineEventSnapshot))]
[JsonSerializable(typeof(ClockSyncRequest))]
[JsonSerializable(typeof(ClockSyncResponse))]
[JsonSerializable(typeof(VersionedCommandRequest))]
[JsonSerializable(typeof(ResolveEventRenameRequest))]
[JsonSerializable(typeof(NonResolveEventPatchRequest))]
[JsonSerializable(typeof(ImportXmlRequest))]
[JsonSerializable(typeof(ImportBundleRequest))]
[JsonSerializable(typeof(ShowRefetchRequiredMessage))]
[JsonSerializable(typeof(PlaybackStateChangedMessage))]
[JsonSerializable(typeof(LiveModeChangedMessage))]
public partial class AppJsonSerializerContext : JsonSerializerContext;
