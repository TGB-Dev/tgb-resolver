namespace TGB.Resolver.Server.Commons.Data;

public sealed class StoredShowState
{
  public string Id { get; set; } = "local-show";

  public int ShowVersion { get; set; }

  public string PayloadJson { get; set; } = string.Empty;

  public long UpdatedAtUnixMs { get; set; }
}