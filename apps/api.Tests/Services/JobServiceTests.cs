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
    public async Task CreateRetryJobAsync_PreservesDraftClaimSelectionMetadata()
    {
        await using var database = await TestDatabase.CreateAsync();
        await using var db = database.CreateContext();
        var job = SeedJob(
            db,
            status: "FAILED",
            progress: 100,
            claimSelectionDraftId: "draft-1",
            preparedStage1Json: """{"preparedUnderstanding":{"atomicClaims":[{"id":"AC_01"},{"id":"AC_02"},{"id":"AC_03"},{"id":"AC_04"},{"id":"AC_05"},{"id":"AC_06"}]}}""",
            claimSelectionJson: """{"selectedClaimIds":["AC_01","AC_03","AC_05"]}""");
        await db.SaveChangesAsync();

        var service = CreateJobService(db);
        var retryJob = await service.CreateRetryJobAsync(job.JobId, retryReason: "preserve selected claims");

        await using var verifyDb = database.CreateContext();
        var reloaded = await verifyDb.Jobs.SingleAsync(j => j.JobId == retryJob.JobId);
        Assert.Equal("retry", reloaded.SubmissionPath);
        Assert.Null(reloaded.ClaimSelectionDraftId);
        Assert.Equal(job.PreparedStage1Json, reloaded.PreparedStage1Json);
        Assert.Equal(job.ClaimSelectionJson, reloaded.ClaimSelectionJson);
    }

    private static JobService CreateJobService(FhDbContext db)
    {
        return new JobService(db, NullLogger<JobService>.Instance, new AppBuildInfo());
    }

    private static JobEntity SeedJob(
        FhDbContext db,
        string status,
        int progress,
        string? claimSelectionDraftId = null,
        string? preparedStage1Json = null,
        string? claimSelectionJson = null)
    {
        var job = new JobEntity
        {
            JobId = Guid.NewGuid().ToString("N"),
            Status = status,
            Progress = progress,
            InputType = "text",
            InputValue = "A verifiable claim",
            PipelineVariant = "claimboundary",
            ClaimSelectionDraftId = claimSelectionDraftId,
            PreparedStage1Json = preparedStage1Json,
            ClaimSelectionJson = claimSelectionJson,
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
