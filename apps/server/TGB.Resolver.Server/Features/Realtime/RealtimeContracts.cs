using Tapper;
using TGB.Resolver.Server.Commons.Types;
using TGB.Resolver.Server.Features.Show.Dto;
using TypedSignalR.Client;

namespace TGB.Resolver.Server.Features.Realtime;

[TranspilationSource]
// ReSharper disable once UnusedType.Global
// ReSharper disable UnusedMember.Global
public enum ShowMessageType
{
  ShowReplaced,
  TimelineEventAdded,
  TimelineEventUpdated,
  TimelineEventRemoved,
  TimelineReordered,
  PlaybackStateChanged,
  LiveModeChanged
}
// ReSharper restore UnusedMember.Global

[TranspilationSource]
public sealed record TimelineEventAddedMessage(
  int ShowVersion,
  TimelineEventSnapshot Event);

[TranspilationSource]
public sealed record TimelineEventUpdatedMessage(
  int ShowVersion,
  TimelineEventSnapshot Event);

[TranspilationSource]
public sealed record TimelineEventRemovedMessage(
  int ShowVersion,
  int EventId);

[TranspilationSource]
public sealed record TimelineReorderedMessage(
  int ShowVersion,
  IReadOnlyList<int> OrderedEventIds);

[TranspilationSource]
public sealed record ShowReplacedMessage(
  int ShowVersion);

[TranspilationSource]
public sealed record PlaybackStateChangedMessage(
  int ShowVersion,
  PlaybackStateSnapshot Playback);

[TranspilationSource]
public sealed record LiveModeChangedMessage(
  int ShowVersion,
  ShowMode Mode);

[Receiver]
public interface IShowHubClient
{
  Task TimelineEventAdded(TimelineEventAddedMessage message);
  Task TimelineEventUpdated(TimelineEventUpdatedMessage message);
  Task TimelineEventRemoved(TimelineEventRemovedMessage message);
  Task TimelineReordered(TimelineReorderedMessage message);
  Task ShowReplaced(ShowReplacedMessage message);
  Task PlaybackStateChanged(PlaybackStateChangedMessage message);
  Task LiveModeChanged(LiveModeChangedMessage message);
}