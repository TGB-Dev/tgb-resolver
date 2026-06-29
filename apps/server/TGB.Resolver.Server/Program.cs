using FastEndpoints;
using FastEndpoints.Swagger;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using TGB.Resolver.Server.Application.Serialization;
using TGB.Resolver.Server.Application.Shows;
using TGB.Resolver.Server.Hubs;
using TGB.Resolver.Server.Infrastructure.Persistence;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);
const string FrontendCorsPolicy = "Frontend";

var allowedOrigins =
  builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
  ?? ["http://127.0.0.1:3000", "http://localhost:3000"];

builder.Services.AddCors(o =>
  o.AddPolicy(FrontendCorsPolicy, p => p
    .WithOrigins(allowedOrigins)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));
builder.Services.Configure<JsonOptions>(options =>
{
  options.SerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
  options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
  options.SerializerOptions.TypeInfoResolverChain.Add(AppJsonSerializerContext.Default);
  options.SerializerOptions.TypeInfoResolver = JsonTypeInfoResolver.Combine(
    AppJsonSerializerContext.Default,
    new DefaultJsonTypeInfoResolver());
});

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton(AppJsonSerializerContext.Default);
builder.Services.AddSingleton<IAppJsonSerializer, AppJsonSerializer>();
builder.Services.AddDbContext<ResolverDbContext>(options =>
{
  var dataDirectory = Path.Combine(builder.Environment.ContentRootPath, ".data");
  Directory.CreateDirectory(dataDirectory);
  options.UseSqlite($"Data Source={Path.Combine(dataDirectory, "resolver.db")}");
});
builder.Services.AddFastEndpoints();
builder.Services.SwaggerDocument(options =>
{
  options.DocumentSettings = settings =>
  {
    settings.DocumentName = "v1";
    settings.Title = "TGB Resolver Server";
    settings.Version = "v1";
  };
  options.ShortSchemaNames = true;
});
builder.Services.AddSignalR().AddMessagePackProtocol();
builder.Services.AddScoped<IShowStateService, ShowStateService>();

var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
  var dbContext = scope.ServiceProvider.GetRequiredService<ResolverDbContext>();
  await dbContext.Database.EnsureCreatedAsync();

  var showStateService = scope.ServiceProvider.GetRequiredService<IShowStateService>();
  await showStateService.EnsureSeededAsync();
}

app.UseCors(FrontendCorsPolicy);
app.MapGet("/", () => Results.Ok("TGB Resolver Server"));
app.UseFastEndpoints();
await app.ExportSwaggerDocsAndExitAsync("v1");
app.MapHub<ShowHub>("/hubs/show").RequireCors(FrontendCorsPolicy);
app.UseSwaggerGen(options =>
{
  options.Path = "/openapi/{documentName}.json";
});
app.MapScalarApiReference();
app.Run();
