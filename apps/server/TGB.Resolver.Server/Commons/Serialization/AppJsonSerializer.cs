using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;

namespace TGB.Resolver.Server.Commons.Serialization;

public sealed class AppJsonSerializer(AppJsonSerializerContext context)
{
  private readonly JsonSerializerOptions _options = CreateOptions(context);

  private static JsonSerializerOptions CreateOptions(AppJsonSerializerContext context)
  {
    var options = new JsonSerializerOptions(JsonSerializerDefaults.Web)
    {
      TypeInfoResolver = JsonTypeInfoResolver.Combine(
        context,
        new DefaultJsonTypeInfoResolver())
    };

    Configure(options, context);
    return options;
  }

  private static void Configure(JsonSerializerOptions options, AppJsonSerializerContext context)
  {
    options.TypeInfoResolver = JsonTypeInfoResolver.Combine(
      context,
      new DefaultJsonTypeInfoResolver());
    options.Converters.Add(new JsonStringEnumConverter());
  }

  public string Serialize<T>(T value)
  {
    return JsonSerializer.Serialize(value, _options);
  }

  public string SerializeUnknown(object value)
  {
    return JsonSerializer.Serialize(value, value.GetType(), _options);
  }

  public T Deserialize<T>(string json)
  {
    var value = JsonSerializer.Deserialize<T>(json, _options);

    return value ?? throw new InvalidOperationException($"Unable to deserialize {typeof(T).Name}");
  }
}