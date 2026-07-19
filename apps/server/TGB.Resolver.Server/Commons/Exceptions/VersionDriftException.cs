namespace TGB.Resolver.Server.Commons.Exceptions;

public sealed class VersionDriftException(int expectedVersion, int actualVersion)
    : Exception($"Expected showVersion {expectedVersion}, got {actualVersion}")
{
    public int ExpectedVersion { get; } = expectedVersion;

    public int ActualVersion { get; } = actualVersion;
}