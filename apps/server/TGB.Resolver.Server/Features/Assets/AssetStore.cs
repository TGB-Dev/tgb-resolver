namespace TGB.Resolver.Server.Features.Assets;

public sealed class AssetStore(IHostEnvironment environment)
{
    private readonly string _rootPath = Path.Combine(environment.ContentRootPath, ".data", "assets");

    public Task SaveAsync(string id, byte[] bytes, CancellationToken cancellationToken = default)
    {
        Directory.CreateDirectory(_rootPath);
        return File.WriteAllBytesAsync(PathFor(id), bytes, cancellationToken);
    }

    public async Task<(byte[] Bytes, string ContentType)> ReadAsync(string id,
        CancellationToken cancellationToken = default)
    {
        var path = PathFor(id);
        return !File.Exists(path)
            ? throw new FileNotFoundException("Asset does not exist.", id)
            : (await File.ReadAllBytesAsync(path, cancellationToken), "application/octet-stream");
    }

    public Task DeleteAsync(string id)
    {
        var path = PathFor(id);
        if (File.Exists(path)) File.Delete(path);

        return Task.CompletedTask;
    }

    private string PathFor(string id)
    {
        if (string.IsNullOrWhiteSpace(id) ||
            id.Any(c => !char.IsAsciiLetterOrDigit(c) && c is not '-' and not '_'))
            throw new InvalidOperationException(
                "Asset id must contain only ASCII letters, digits, hyphens, or underscores.");

        return Path.Combine(_rootPath, id);
    }
}