using FactHarbor.Api.Data;
using FactHarbor.Api.Services;
using Microsoft.EntityFrameworkCore;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS allowlist: localhost web app for development + optional configured origin(s) for pre-release.
var corsOrigins = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
{
    "http://localhost:3000"
};
var configuredCorsOrigins = Environment.GetEnvironmentVariable("FH_CORS_ORIGIN");
if (!string.IsNullOrWhiteSpace(configuredCorsOrigins))
{
    foreach (var origin in configuredCorsOrigins.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
    {
        if (Uri.TryCreate(origin, UriKind.Absolute, out var uri) &&
            (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
        {
            corsOrigins.Add(uri.GetLeftPart(UriPartial.Authority));
        }
    }
}
builder.Services.AddCors(options =>
{
    options.AddPolicy("FactHarborCors", policy =>
        policy.WithOrigins(corsOrigins.ToArray())
            .AllowAnyHeader()
            .AllowAnyMethod());
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync(
            "{\"error\":\"Rate limit exceeded: max 5 analyze requests per minute per IP\"}",
            token);
    };

    options.AddPolicy("AnalyzePerIp", httpContext =>
    {
        // Admins bypass rate limiting
        if (FactHarbor.Api.Helpers.AuthHelper.IsAdminKeyValid(httpContext.Request))
            return RateLimitPartition.GetNoLimiter("admin");

        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            AutoReplenishment = true
        });
    });
});

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

// Run migrations and seed data
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<FhDbContext>();
    db.Database.Migrate();

    // Seed default invite code if none exist
    if (!db.InviteCodes.Any())
    {
        db.InviteCodes.Add(new InviteCodeEntity
        {
            Code = "BETA-PREVIEW-2026",
            Description = "Default public preview code",
            MaxJobs = 10,
            DailyLimit = 2,
            UsedJobs = 0,
            IsActive = true
        });
        db.SaveChanges();
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("FactHarborCors");
app.UseRateLimiter();

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
