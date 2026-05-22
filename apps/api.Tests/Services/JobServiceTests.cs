using System.Text.Json.Nodes;
using FactHarbor.Api.Tests;
using FactHarbor.Api.Data;
using FactHarbor.Api.Helpers;
using FactHarbor.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace FactHarbor.Api.Tests.Services;

public sealed class JobServiceTests
{
    [Fact]
    public async Task CreateJobAsync_DefaultsSubmissionPathToDirectApi()
    {
        await using var database = await TestDatabase.CreateAsync();
        await using var db = database.CreateContext();
        var service = CreateJobService(db);

        var job = await service.CreateJobAsync("text", "A verifiable claim");

        Assert.Equal("direct-api", job.SubmissionPath);
        Assert.Equal("claimboundary-v2", job.PipelineVariant);
        Assert.Equal("direct-api", (await db.Jobs.SingleAsync(j => j.JobId == job.JobId)).SubmissionPath);
    }

    [Fact]
    public async Task CreateJobAsync_PreservesExplicitLegacyPipelineVariant()
    {
        await using var database = await TestDatabase.CreateAsync();
        await using var db = database.CreateContext();
        var service = CreateJobService(db);

        var job = await service.CreateJobAsync("text", "A verifiable claim", pipelineVariant: "claimboundary");

        Assert.Equal("claimboundary", job.PipelineVariant);
        Assert.Equal("claimboundary", (await db.Jobs.SingleAsync(j => j.JobId == job.JobId)).PipelineVariant);
    }

    [Fact]
    public async Task CreateRetryJobAsync_StampsRetrySubmissionPath()
    {
        await using var database = await TestDatabase.CreateAsync();
        await using var db = database.CreateContext();
        var original = SeedJob(db, status: "FAILED", progress: 100);
        await db.SaveChangesAsync();
        var service = CreateJobService(db);

        var retry = await service.CreateRetryJobAsync(original.JobId);

        Assert.Equal("retry", retry.SubmissionPath);
        Assert.Equal("retry", (await db.Jobs.SingleAsync(j => j.JobId == retry.JobId)).SubmissionPath);
    }

    [Fact]
    public async Task UpdateStatusAsync_DoesNotReviveCancelledJob()
    {
        await using var database = await TestDatabase.CreateAsync();
        await using var db = database.CreateContext();
        var job = SeedJob(db, status: "CANCELLED", progress: 22);
        await db.SaveChangesAsync();

        var service = CreateJobService(db);
        await service.UpdateStatusAsync(job.JobId, "RUNNING", 45, "info", "late runner progress");

        await using var verifyDb = database.CreateContext();
        var reloaded = await verifyDb.Jobs.SingleAsync(j => j.JobId == job.JobId);
        Assert.Equal("CANCELLED", reloaded.Status);
        Assert.Equal(22, reloaded.Progress);
        Assert.Contains(
            await verifyDb.JobEvents.Where(e => e.JobId == job.JobId).Select(e => e.Message).ToListAsync(),
            message => message.Contains("Ignored status update after terminal status CANCELLED")
                && message.Contains("requested RUNNING"));
    }

    [Fact]
    public async Task StoreResultAsync_DoesNotPersistResultAfterCancellation()
    {
        await using var database = await TestDatabase.CreateAsync();
        await using var db = database.CreateContext();
        var job = SeedJob(db, status: "CANCELLED", progress: 22);
        await db.SaveChangesAsync();

        var service = CreateJobService(db);
        await service.StoreResultAsync(
            job.JobId,
            new { truthPercentage = 90, confidence = 80 },
            "# Late report");

        await using var verifyDb = database.CreateContext();
        var reloaded = await verifyDb.Jobs.SingleAsync(j => j.JobId == job.JobId);
        Assert.Equal("CANCELLED", reloaded.Status);
        Assert.Null(reloaded.ResultJson);
        Assert.Null(reloaded.ReportMarkdown);
        Assert.Null(reloaded.VerdictLabel);
        Assert.Null(reloaded.TruthPercentage);
        Assert.Null(reloaded.Confidence);
        Assert.Contains(
            await verifyDb.JobEvents.Where(e => e.JobId == job.JobId).Select(e => e.Message).ToListAsync(),
            message => message.Contains("Ignored result store after terminal status CANCELLED"));
    }

    [Fact]
    public async Task StoreResultAsync_BlockedV2Result_StoresNullQuickFields()
    {
        await using var database = await TestDatabase.CreateAsync();
        await using var db = database.CreateContext();
        var job = SeedJob(db, status: "RUNNING", progress: 45);
        await db.SaveChangesAsync();

        var result = JsonNode.Parse(FixtureFiles.ReadAnalyzerV2Fixture("report-result-v2.fixture.json"))!.AsObject();
        var verdict = result["verdict"]!.AsObject();
        verdict["label"] = "FALSE";
        verdict["truthPercentage"] = 93;
        verdict["confidence"] = 91;

        var service = CreateJobService(db);
        await service.StoreResultAsync(job.JobId, result, "# V2 report");

        await using var verifyDb = database.CreateContext();
        var reloaded = await verifyDb.Jobs.SingleAsync(j => j.JobId == job.JobId);
        Assert.Null(reloaded.VerdictLabel);
        Assert.Null(reloaded.TruthPercentage);
        Assert.Null(reloaded.Confidence);
    }

    [Fact]
    public async Task StoreResultAsync_ApprovedV2Result_StoresCanonicalQuickFields()
    {
        await using var database = await TestDatabase.CreateAsync();
        await using var db = database.CreateContext();
        var job = SeedJob(db, status: "RUNNING", progress: 45);
        await db.SaveChangesAsync();

        var result = JsonNode.Parse(FixtureFiles.ReadAnalyzerV2Fixture("report-result-v2.fixture.json"))!.AsObject();
        result["_schemaVersion"] = "4.0.0-cb";
        var meta = result["meta"]!.AsObject();
        meta["schemaVersion"] = "4.0.0-cb";
        meta["publicCutoverStatus"] = "approved";
        var verdict = result["verdict"]!.AsObject();
        verdict["label"] = "FALSE";
        verdict["truthPercentage"] = 93;
        verdict["confidence"] = 91;

        var service = CreateJobService(db);
        await service.StoreResultAsync(job.JobId, result, "# V2 report");

        await using var verifyDb = database.CreateContext();
        var reloaded = await verifyDb.Jobs.SingleAsync(j => j.JobId == job.JobId);
        Assert.Equal("FALSE", reloaded.VerdictLabel);
        Assert.Equal(93, reloaded.TruthPercentage);
        Assert.Equal(91, reloaded.Confidence);
    }

    private static JobService CreateJobService(FhDbContext db)
    {
        return new JobService(db, NullLogger<JobService>.Instance, new AppBuildInfo());
    }

    private static JobEntity SeedJob(FhDbContext db, string status, int progress)
    {
        var job = new JobEntity
        {
            JobId = Guid.NewGuid().ToString("N"),
            Status = status,
            Progress = progress,
            InputType = "text",
            InputValue = "A verifiable claim",
            PipelineVariant = "claimboundary",
            CreatedUtc = DateTime.UtcNow,
            UpdatedUtc = DateTime.UtcNow,
        };
        db.Jobs.Add(job);
        return job;
    }

    private sealed class TestDatabase : IAsyncDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly DbContextOptions<FhDbContext> _options;

        private TestDatabase(SqliteConnection connection, DbContextOptions<FhDbContext> options)
        {
            _connection = connection;
            _options = options;
        }

        public static async Task<TestDatabase> CreateAsync()
        {
            var connection = new SqliteConnection("Data Source=:memory:");
            await connection.OpenAsync();
            var options = new DbContextOptionsBuilder<FhDbContext>()
                .UseSqlite(connection)
                .Options;
            await using var db = new FhDbContext(options);
            await db.Database.EnsureCreatedAsync();
            return new TestDatabase(connection, options);
        }

        public FhDbContext CreateContext() => new(_options);

        public async ValueTask DisposeAsync()
        {
            await _connection.DisposeAsync();
        }
    }
}
