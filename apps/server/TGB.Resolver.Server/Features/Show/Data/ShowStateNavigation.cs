namespace TGB.Resolver.Server.Features.Show.Data;

internal static class ShowStateNavigation
{
  public static TimelineEvent[] Ordered(this ShowState state)
  {
    return state.Timeline.OrderBy(e => e.Position).ToArray();
  }

  public static int IndexOfEvent(this TimelineEvent[] ordered, int eventId)
  {
    return Array.FindIndex(ordered, e => e.Id == eventId);
  }
}