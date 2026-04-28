using FactHarbor.Api.Data;
using FactHarbor.Api.Services;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using System.Data;
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
builder.Services.AddScoped<ClaimSelectionDraftService>();
builder.Services.AddSingleton<FactHarbor.Api.Helpers.AppBuildInfo>();

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
    EnsureJobsColumn(db, "GitCommitHash", "TEXT");
    EnsureJobsColumn(db, "ExecutedWebGitCommitHash", "TEXT");
    EnsureJobsColumn(db, "SubmissionPath", "TEXT");
    EnsureJobsColumn(db, "ClaimSelectionDraftId", "TEXT");
    EnsureJobsColumn(db, "PreparedStage1Json", "TEXT");
    EnsureJobsColumn(db, "ClaimSelectionJson", "TEXT");
    EnsureClaimSelectionDraftsTable(db);
    EnsureClaimSelectionDraftsColumn(db, "LastEventMessage", "TEXT");
    EnsureClaimSelectionDraftsColumn(db, "IsHidden", "INTEGER NOT NULL DEFAULT 0");
    EnsureClaimSelectionDraftEventsTable(db);
    EnsureUniqueJobDraftIndex(db);

    // Mark RUNNING jobs as INTERRUPTED (genuinely orphaned mid-execution by restart).
    // QUEUED jobs are left as-is — they were never started and the runner will pick
    // them up after restart via its bootstrap drain + watchdog recovery.
    var orphanedRunning = db.Jobs
        .Where(j => j.Status == "RUNNING")
        .ToList();
    if (orphanedRunning.Count > 0)
    {
        var now = DateTime.UtcNow;
        foreach (var orphan in orphanedRunning)
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

static void EnsureClaimSelectionDraftsTable(FhDbContext db)
{
    var connection = db.Database.GetDbConnection();
    var shouldClose = connection.State != ConnectionState.Open;
    if (shouldClose) connection.Open();
    try
    {
        using var check = connection.CreateCommand();
        check.CommandText = "SELECT 1 FROM sqlite_master WHERE type='table' AND name='ClaimSelectionDrafts' LIMIT 1;";
        if (check.ExecuteScalar() is not null) return;

        using var create = connection.CreateCommand();
        create.CommandText = @"
            CREATE TABLE ClaimSelectionDrafts (
                DraftId TEXT NOT NULL PRIMARY KEY,
                Status TEXT NOT NULL DEFAULT 'QUEUED',
                Progress INTEGER NOT NULL DEFAULT 0,
                CreatedUtc TEXT NOT NULL,
                UpdatedUtc TEXT NOT NULL,
                ExpiresUtc TEXT NOT NULL,
                OriginalInputType TEXT NOT NULL DEFAULT 'text',
                ActiveInputType TEXT NOT NULL DEFAULT 'text',
                OriginalInputValue TEXT NOT NULL DEFAULT '',
                ActiveInputValue TEXT NOT NULL DEFAULT '',
                PipelineVariant TEXT NOT NULL DEFAULT 'claimboundary',
                InviteCode TEXT,
                SelectionMode TEXT NOT NULL DEFAULT 'interactive',
                RestartedViaOther INTEGER NOT NULL DEFAULT 0,
                RestartCount INTEGER NOT NULL DEFAULT 0,
                LastEventMessage TEXT,
                DraftStateJson TEXT,
                DraftAccessTokenHash TEXT,
                IsHidden INTEGER NOT NULL DEFAULT 0,
                FinalJobId TEXT
            );
            CREATE INDEX IX_ClaimSelectionDrafts_Status ON ClaimSelectionDrafts (Status);";
        create.ExecuteNonQuery();
    }
    finally
    {
        if (shouldClose) connection.Close();
    }
}

static void EnsureClaimSelectionDraftEventsTable(FhDbContext db)
{
    var connection = db.Database.GetDbConnection();
    var shouldClose = connection.State != ConnectionState.Open;
    if (shouldClose) connection.Open();
    try
    {
        using var check = connection.CreateCommand();
        check.CommandText = "SELECT 1 FROM sqlite_master WHERE type='table' AND name='ClaimSelectionDraftEvents' LIMIT 1;";
        if (check.ExecuteScalar() is not null) return;

        using var create = connection.CreateCommand();
        create.CommandText = @"
            CREATE TABLE ClaimSelectionDraftEvents (
                Id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                DraftId TEXT NOT NULL,
                TsUtc TEXT NOT NULL,
                ActorType TEXT NOT NULL,
                Action TEXT NOT NULL,
                Result TEXT NOT NULL,
                BeforeStatus TEXT,
                AfterStatus TEXT,
                SourceIp TEXT,
                Message TEXT
            );
            CREATE INDEX IX_ClaimSelectionDraftEvents_DraftId_Id ON ClaimSelectionDraftEvents (DraftId, Id);";
        create.ExecuteNonQuery();
    }
    finally
    {
        if (shouldClose) connection.Close();
    }
}

static void EnsureClaimSelectionDraftsColumn(FhDbContext db, string columnName, string sqlType)
{
    var connection = db.Database.GetDbConnection();
    var shouldClose = connection.State != ConnectionState.Open;
    if (shouldClose)
        connection.Open();

    try
    {
        using var check = connection.CreateCommand();
        check.CommandText = "SELECT 1 FROM pragma_table_info('ClaimSelectionDrafts') WHERE name = $name LIMIT 1;";
        var parameter = check.CreateParameter();
        parameter.ParameterName = "$name";
        parameter.Value = columnName;
        check.Parameters.Add(parameter);

        var exists = check.ExecuteScalar() is not null;
        if (exists)
            return;

        using var alter = connection.CreateCommand();
        alter.CommandText = $"ALTER TABLE ClaimSelectionDrafts ADD COLUMN \"{columnName}\" {sqlType}";
        alter.ExecuteNonQuery();
    }
    finally
    {
        if (shouldClose)
            connection.Close();
    }
}

static void EnsureJobsColumn(FhDbContext db, string columnName, string sqlType)
{
    var connection = db.Database.GetDbConnection();
    var shouldClose = connection.State != ConnectionState.Open;
    if (shouldClose)
        connection.Open();

    try
    {
        using var check = connection.CreateCommand();
        check.CommandText = "SELECT 1 FROM pragma_table_info('Jobs') WHERE name = $name LIMIT 1;";
        var parameter = check.CreateParameter();
        parameter.ParameterName = "$name";
        parameter.Value = columnName;
        check.Parameters.Add(parameter);

        var exists = check.ExecuteScalar() is not null;
        if (exists)
            return;

        using var alter = connection.CreateCommand();
        alter.CommandText = $"ALTER TABLE Jobs ADD COLUMN \"{columnName}\" {sqlType}";
        alter.ExecuteNonQuery();
    }
    finally
    {
        if (shouldClose)
            connection.Close();
    }
}

static void EnsureUniqueJobDraftIndex(FhDbContext db)
{
    var connection = db.Database.GetDbConnection();
    var shouldClose = connection.State != ConnectionState.Open;
    if (shouldClose)
        connection.Open();

    try
    {
        using var check = connection.CreateCommand();
        check.CommandText = "SELECT 1 FROM sqlite_master WHERE type='index' AND name='IX_Jobs_ClaimSelectionDraftId' LIMIT 1;";
        if (check.ExecuteScalar() is not null)
            return;

        using var create = connection.CreateCommand();
        create.CommandText = "CREATE UNIQUE INDEX IX_Jobs_ClaimSelectionDraftId ON Jobs (ClaimSelectionDraftId);";
        create.ExecuteNonQuery();
    }
    finally
    {
        if (shouldClose)
            connection.Close();
    }
}
