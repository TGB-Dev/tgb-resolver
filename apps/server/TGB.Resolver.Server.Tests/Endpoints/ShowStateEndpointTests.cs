using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.Testing;
using TGB.Resolver.Server.Features.Show.Dto;

namespace TGB.Resolver.Server.Tests.Endpoints;

public sealed class ShowStateEndpointTests
{
  private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
  {
    Converters = { new JsonStringEnumConverter() }
  };

  [Test]
  // ReSharper does not recognize TUnit's source-generated test discovery.
  // ReSharper disable once UnusedMember.Global
  public async Task GetTimeline_ReturnsCurrentSnapshot()
  {
    await using var factory = new WebApplicationFactory<Program>();
    using var client = factory.CreateClient();

    var payload = await client.GetFromJsonAsync<ShowStateSnapshot>("/timeline", JsonOptions);

    await Assert.That(payload).IsNotNull();
    await Assert.That(payload!.Meta.Title).IsNotEmpty();
    await Assert.That(payload.Timeline.Count).IsGreaterThan(0);
  }
}