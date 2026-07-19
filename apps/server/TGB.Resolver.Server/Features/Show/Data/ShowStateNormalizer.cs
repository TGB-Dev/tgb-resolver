namespace TGB.Resolver.Server.Features.Show.Data;

/// <summary>
///   Bundles serialized by older builds may omit the contest problem/user/freeze
///   maps. Coerce any null collections to empty so downstream mapping never NREs.
/// </summary>
public static class ShowStateNormalizer
{
  public static ShowState Normalize(ShowState show)
  {
    var problems = (IReadOnlyList<ProblemDefinition>?)show.Contest.Problems;
    var users = (IReadOnlyList<UserDefinition>?)show.Contest.Users;
    var freeze = (IReadOnlyList<FreezeSnapshotEntry>?)show.Contest.PreFreezeSnapshot;
    if (problems is not null && users is not null && freeze is not null) return show;

    return show with
    {
      Contest = show.Contest with
      {
        Problems = problems ?? [],
        Users = users ?? [],
        PreFreezeSnapshot = freeze ?? []
      }
    };
  }
}