using TGB.Resolver.Server.Commons.Types;
using TGB.Resolver.Server.Features.Show.Dto;

namespace TGB.Resolver.Server.Features.Realtime;

public sealed record ShowRefetchRequiredMessage(
  int ShowVersion,
  ShowRefetchReason Reason);

public sealed record PlaybackStateChangedMessage(
  int ShowVersion,
  PlaybackStateSnapshot Playback);

public sealed record LiveModeChangedMessage(
  int ShowVersion,
  ShowMode Mode);

public interface IShowHubClient
{
  Task ShowRefetchRequired(ShowRefetchRequiredMessage message);
  Task PlaybackStateChanged(PlaybackStateChangedMessage message);
  Task LiveModeChanged(LiveModeChangedMessage message);
}