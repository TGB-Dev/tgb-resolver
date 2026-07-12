namespace TGB.Resolver.Server.Commons.Types;

public enum TimelineMode
{
  Rw,
  Ro
}

public enum ShowSource
{
  Xml,
  Bundle,
  Manual
}

public enum PlaybackStatus
{
  Idle,
  Running,
  Paused
}

public enum TimelineEventType
{
  Res,
  Img,
  Sfx
}

public enum ShowMode
{
  Editing,
  Live
}

public enum ShowRefetchReason
{
  ShowReplaced,
  Optimized
}