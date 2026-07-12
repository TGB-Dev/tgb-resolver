using Tapper;
using TGB.Resolver.Server.Commons.Types;
using TGB.Resolver.Server.Features.Show.Dto;
using TypedSignalR.Client;

namespace TGB.Resolver.Server.Features.Realtime;

[TranspilationSource]
public sealed record ShowRefetchRequiredMessage(
  int ShowVersion,
  ShowRefetchReason Reason);

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
  Task ShowRefetchRequired(ShowRefetchRequiredMessage message);
  Task PlaybackStateChanged(PlaybackStateChangedMessage message);
  Task LiveModeChanged(LiveModeChangedMessage message);
}