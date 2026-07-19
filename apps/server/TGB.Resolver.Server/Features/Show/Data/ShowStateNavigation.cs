using TGB.Resolver.Server.Commons.Types;

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

    public static TimelineEvent? ResolveBefore(this TimelineEvent[] ordered, int eventId)
    {
        var idx = ordered.IndexOfEvent(eventId);
        return idx < 0
            ? null
            : ordered.Take(idx + 1).LastOrDefault(e => e.Type == TimelineEventType.Res);
    }

    public static TimelineEvent? NextResolveAfter(this TimelineEvent[] ordered, int resolveId)
    {
        var idx = ordered.IndexOfEvent(resolveId);
        return idx < 0
            ? null
            : ordered.Skip(idx + 1).FirstOrDefault(e => e.Type == TimelineEventType.Res);
    }

    public static int[] InlineIdsBetween(this TimelineEvent[] ordered, int fromId, int? toId)
    {
        return ordered
            .Where(e => e.Id > fromId && e.Id < (toId ?? int.MaxValue) && e.Type != TimelineEventType.Res)
            .Select(e => e.Id)
            .ToArray();
    }

    public static double CumulativeOffsetUpTo(this TimelineEvent[] ordered, int upToIndex)
    {
        double total = 0;
        for (var i = 0; i < upToIndex; i++)
            total += ordered[i].TriggerOffsetSeconds ?? 0;
        return total;
    }
}