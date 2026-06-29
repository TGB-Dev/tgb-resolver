using System.Text.Json;
using System.Text.Json.Serialization.Metadata;

namespace TGB.Resolver.Server.Application.Serialization;

public interface IAppJsonSerializer
{
    string Serialize<T>(T value);
    string SerializeUnknown(object value);
    T Deserialize<T>(string json);
}

public sealed class AppJsonSerializer : IAppJsonSerializer
{
    private readonly JsonSerializerOptions _options;

    public AppJsonSerializer(AppJsonSerializerContext context)
    {
        _options = CreateOptions(context);
    }

    public static JsonSerializerOptions CreateOptions(AppJsonSerializerContext context)
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

    public static void Configure(JsonSerializerOptions options, AppJsonSerializerContext context)
    {
        options.TypeInfoResolver = JsonTypeInfoResolver.Combine(
            context,
            new DefaultJsonTypeInfoResolver());
        options.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
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
