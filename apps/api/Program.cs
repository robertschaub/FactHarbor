using FactHarbor.Api.Data;
using FactHarbor.Api.Services;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Text.Json;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    // Trust only local reverse proxies (Caddy on same host) for forwarded headers.
    options.KnownProxies.Add(IPAddress.Parse("127.0.0.1"));
    options.KnownProxies.Add(IPAddress.Parse("::1"));
});

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

// Rate-limit config: prefer new RateLimiting__* keys, fall back to legacy FH_* env vars.
// DEPRECATED: FH_READ_PER_IP_PER_MIN / FH_ANALYZE_PER_IP_PER_MIN — remove after all
// deployments migrate to RateLimiting__ReadPerIpPerMin / RateLimiting__AnalyzePerIpPerMin.
var readPerIpPermitLimit = builder.Configuration.GetValue("RateLimiting:ReadPerIpPerMin", 0);
if (readPerIpPermitLimit < 1)
{
    var legacyRead = Environment.GetEnvironmentVariable("FH_READ_PER_IP_PER_MIN");
    readPerIpPermitLimit = int.TryParse(legacyRead, out var lr) && lr > 0 ? lr : 120;
}
var analyzePerIpPermitLimit = builder.Configuration.GetValue("RateLimiting:AnalyzePerIpPerMin", 0);
if (analyzePerIpPermitLimit < 1)
{
    var legacyAnalyze = Environment.GetEnvironmentVariable("FH_ANALYZE_PER_IP_PER_MIN");
    analyzePerIpPermitLimit = int.TryParse(legacyAnalyze, out var la) && la > 0 ? la : 5;
}

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, token) =>
    {
        var path = context.HttpContext.Request.Path.Value ?? "";
        var message = path.StartsWith("/v1/analyze", StringComparison.OrdinalIgnoreCase)
            ? $"Rate limit exceeded: max {analyzePerIpPermitLimit} analyze requests per minute per IP"
            : $"Rate limit exceeded: max {readPerIpPermitLimit} read requests per minute per IP";
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync(
            JsonSerializer.Serialize(new { error = message }),
            token);
    };

    options.AddPolicy("ReadPerIp", httpContext =>
    {
        if (FactHarbor.Api.Helpers.AuthHelper.IsAdminKeyValid(httpContext.Request))
            return RateLimitPartition.GetNoLimiter("admin");

        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter($"read-{ip}", _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = readPerIpPermitLimit,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            AutoReplenishment = true
        });
    });

    options.AddPolicy("AnalyzePerIp", httpContext =>
    {
        // Admins bypass rate limiting
        if (FactHarbor.Api.Helpers.AuthHelper.IsAdminKeyValid(httpContext.Request))
            return RateLimitPartition.GetNoLimiter("admin");

        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = analyzePerIpPermitLimit,
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

    // Mark any jobs left in RUNNING or QUEUED as INTERRUPTED (orphaned by a restart)
    var orphanedJobs = db.Jobs
        .Where(j => j.Status == "RUNNING" || j.Status == "QUEUED")
        .ToList();
    if (orphanedJobs.Count > 0)
    {
        var now = DateTime.UtcNow;
        foreach (var orphan in orphanedJobs)
        {
            orphan.Status = "INTERRUPTED";
            orphan.UpdatedUtc = now;
            db.JobEvents.Add(new FactHarbor.Api.Data.JobEventEntity
            {
                JobId = orphan.JobId,
                Level = "warn",
                Message = "Job interrupted by server restart.",
                TsUtc = now
            });
        }
        db.SaveChanges();
    }

    // Seed default invite code if none exist
    if (!db.InviteCodes.Any())
    {
        db.InviteCodes.Add(new InviteCodeEntity
        {
            Code = "BETA-PREVIEW-2026",
            Description = "Default public preview code",
            MaxJobs = 25,
            HourlyLimit = 3,
            DailyLimit = 6,
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

app.UseForwardedHeaders();
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
