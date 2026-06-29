namespace TGB.Resolver.Server.Application.Shows;

public sealed class VersionDriftException : Exception
{
    public VersionDriftException(int expectedVersion, int actualVersion)
        : base($"Expected showVersion {expectedVersion}, got {actualVersion}")
    {
        ExpectedVersion = expectedVersion;
        ActualVersion = actualVersion;
    }

    public int ExpectedVersion { get; }

    public int ActualVersion { get; }
}
