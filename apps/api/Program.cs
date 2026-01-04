using FactHarbor.Api.Data;
using FactHarbor.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var provider = builder.Configuration["Db:Provider"]?.ToLowerInvariant() ?? "sqlite";
builder.Services.AddDbContext<FhDbContext>(opt =>
{
    if (provider == "sqlite")
    {
        var cs = builder.Configuration.GetConnectionString("FhDbSqlite");
        opt.UseSqlite(cs);
    }
    else
    {
        throw new InvalidOperationException("Only sqlite is enabled in this POC scaffold.");
    }
});

builder.Services.AddScoped<JobService>();

// Configure HttpClient for RunnerClient with resilient settings
var runnerTimeoutMinutes = builder.Configuration.GetValue("Runner:TimeoutMinutes", 5);
builder.Services.AddHttpClient<RunnerClient>(client =>
{
    // The runner endpoint performs the full LLM workflow before responding.
    // Timeout is configurable via Runner:TimeoutMinutes (default: 5 minutes).
    // RetryClient handles transient failures with exponential backoff.
    client.Timeout = TimeSpan.FromMinutes(runnerTimeoutMinutes);
});

var app = builder.Build();

// Create DB automatically for POC (no dotnet-ef required)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<FhDbContext>();
    db.Database.EnsureCreated();
}

app.UseSwagger();
app.UseSwaggerUI();

// Root route: redirect to Swagger in dev, return API info in prod
app.MapGet("/", () =>
{
    var env = app.Environment;
    if (env.IsDevelopment())
    {
        return Results.Redirect("/swagger");
    }
    return Results.Json(new
    {
        service = "FactHarbor API",
        version = "0.1.0",
        endpoints = new
        {
            health = "/health",
            swagger = "/swagger"
        }
    });
});

app.MapControllers();

app.Run();
