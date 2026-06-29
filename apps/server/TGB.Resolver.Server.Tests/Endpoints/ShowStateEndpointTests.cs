using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using TGB.Resolver.Server.Contracts.Show;

namespace TGB.Resolver.Server.Tests.Endpoints;

public sealed class ShowStateEndpointTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    [Test]
    public async Task GetShow_ReturnsSeededSnapshot()
    {
        using var factory = new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Program>();
        using var client = factory.CreateClient();

        var payload = await client.GetFromJsonAsync<ShowStateSnapshot>("/api/show", JsonOptions);

        await Assert.That(payload).IsNotNull();
        await Assert.That(payload!.Meta.Title).IsEqualTo("Local Show");
        await Assert.That(payload.Timeline.Count).IsGreaterThan(0);
    }
}
