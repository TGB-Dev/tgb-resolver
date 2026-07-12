using Tapper;

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

[TranspilationSource]
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

[TranspilationSource]
public enum ShowMode
{
  Editing,
  Live
}

[TranspilationSource]
public enum ShowRefetchReason
{
  ShowReplaced,
  Optimized
}