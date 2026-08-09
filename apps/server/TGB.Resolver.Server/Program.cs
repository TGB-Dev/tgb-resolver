using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using FastEndpoints;
using FastEndpoints.Swagger;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.EntityFrameworkCore;
using NodaTime;
using Scalar.AspNetCore;
using TGB.Resolver.Server.Commons.Data;
using TGB.Resolver.Server.Commons.Serialization;
using TGB.Resolver.Server.Features.Assets;
using TGB.Resolver.Server.Features.Realtime;
using TGB.Resolver.Server.Features.Show;
using TGB.Resolver.Server.Features.Show.Data;

const string frontendCorsPolicy = "Frontend";

var builder = WebApplication.CreateBuilder(args);

var allowedOrigins =
  builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
  ?? ["http://127.0.0.1:3000", "http://localhost:3000"];

builder.Services.AddCors(o =>
  o.AddPolicy(frontendCorsPolicy, p => p
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

builder.Services.AddSingleton<IClock>(SystemClock.Instance);
builder.Services.AddSingleton(AppJsonSerializerContext.Default);
builder.Services.AddSingleton<AppJsonSerializer>();
builder.Services.AddSingleton<AssetStore>();
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
builder.Services.AddScoped<ShowRawRepository>();
builder.Services.AddScoped<ShowStateService>();
builder.Services.AddSingleton<TimelineOrchestrator>();
builder.Services.AddSingleton<IClockTimer, HrClockTimer>();
builder.Services.AddSingleton<ITimeSource, StopwatchTimeSource>();
builder.Services.AddSingleton<RealtimeClock>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<RealtimeClock>());

var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
  var dbContext = scope.ServiceProvider.GetRequiredService<ResolverDbContext>();
  await dbContext.Database.EnsureCreatedAsync();

  var showStateService = scope.ServiceProvider.GetRequiredService<ShowStateService>();
  await showStateService.EnsureSeededAsync();

  var realtimeClock = scope.ServiceProvider.GetRequiredService<RealtimeClock>();
  var seeded = await showStateService.GetSnapshotAsync();
  realtimeClock.SetTickRate(seeded.TickRate);
}

app.UseCors(frontendCorsPolicy);
app.MapGet("/", () => Results.Ok("TGB Resolver Server"));
app.UseFastEndpoints();
await app.ExportSwaggerDocsAndExitAsync("v1");
app.MapHub<ShowHub>("/hubs/show").RequireCors(frontendCorsPolicy);
app.UseSwaggerGen(options => { options.Path = "/openapi/{documentName}.json"; });
app.MapScalarApiReference();
app.Run();