using TGB.Resolver.Server.Contracts.Show;

namespace TGB.Resolver.Server.Contracts.Realtime;

public enum ShowRefetchReason
{
    VersionDrift,
    ShowReplaced,
    Optimized
}

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
