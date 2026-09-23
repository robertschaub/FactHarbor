using FactHarbor.Api.Data;
using FactHarbor.Api.Helpers;
using FactHarbor.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace FactHarbor.Api.Tests;

/// <summary>
/// Terminal-status contract of <see cref="JobService"/>: SUCCEEDED, FAILED and CANCELLED are
/// final. Runs against an in-memory SQLite database; no files, services or network.
/// </summary>
public sealed class JobServiceStatusTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly FhDbContext _db;
    private readonly JobService _jobs;

    public JobServiceStatusTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        _db = new FhDbContext(new DbContextOptionsBuilder<FhDbContext>().UseSqlite(_connection).Options);
        _db.Database.EnsureCreated();
        _jobs = new JobService(_db, NullLogger<JobService>.Instance, new AppBuildInfo());
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    private static readonly DateTime SeededUpdatedUtc = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    private async Task<string> SeedJobAsync(string status, int progress)
    {
        var job = new JobEntity
        {
            Status = status,
            Progress = progress,
            InputValue = "input",
            UpdatedUtc = SeededUpdatedUtc,
        };
        _db.Jobs.Add(job);
        await _db.SaveChangesAsync();
        return job.JobId;
    }

    private async Task<JobEntity> ReloadJobAsync(string jobId)
    {
        _db.ChangeTracker.Clear();
        return await _db.Jobs.SingleAsync(j => j.JobId == jobId);
    }

    private async Task<List<JobEventEntity>> EventsAsync(string jobId)
        => await _db.JobEvents.Where(e => e.JobId == jobId).OrderBy(e => e.Id).ToListAsync();

    [Theory]
    [InlineData("CANCELLED", "RUNNING")] // late progress event from a pipeline still unwinding
    [InlineData("CANCELLED", "FAILED")] // runner catch path after the abort checkpoint
    [InlineData("CANCELLED", "SUCCEEDED")]
    [InlineData("CANCELLED", "QUEUED")] // AnalyzeController's "Triggering runner" after a quick cancel
    [InlineData("FAILED", "RUNNING")] // stale-failed job whose pipeline is still running
    [InlineData("FAILED", "SUCCEEDED")] // late completion
    [InlineData("FAILED", "QUEUED")]
    [InlineData("SUCCEEDED", "RUNNING")]
    [InlineData("SUCCEEDED", "FAILED")]
    public async Task UpdateStatus_DoesNotLeaveTerminalStatus(string terminalStatus, string requestedStatus)
    {
        var jobId = await SeedJobAsync(terminalStatus, 40);

        var applied = await _jobs.UpdateStatusAsync(jobId, requestedStatus, 99, "error", "late update", "abc1234");

        Assert.False(applied);
        var job = await ReloadJobAsync(jobId);
        Assert.Equal(terminalStatus, job.Status);
        Assert.Equal(40, job.Progress);
        Assert.Null(job.ExecutedWebGitCommitHash);
        Assert.Equal(SeededUpdatedUtc, job.UpdatedUtc);

        var evt = Assert.Single(await EventsAsync(jobId));
        Assert.Equal("info", evt.Level);
        Assert.Equal(
            $"Ignored status update after terminal status {terminalStatus}: requested {requestedStatus} (late update)",
            evt.Message);
    }

    [Fact]
    public async Task UpdateStatus_RepeatedTerminalStatusIsRecordedAsPlainEvent()
    {
        // The runner reports a failure as two FAILED updates: the message, then the stack trace.
        var jobId = await SeedJobAsync("RUNNING", 70);
        Assert.True(await _jobs.UpdateStatusAsync(jobId, "FAILED", 100, "error", "boom"));

        var applied = await _jobs.UpdateStatusAsync(jobId, "FAILED", 100, "error", "Stack (truncated): ...");

        Assert.True(applied);
        var job = await ReloadJobAsync(jobId);
        Assert.Equal("FAILED", job.Status);
        Assert.Equal(100, job.Progress);
        Assert.Equal(
            new[] { ("error", "boom"), ("error", "Stack (truncated): ...") },
            (await EventsAsync(jobId)).Select(e => (e.Level, e.Message)));
    }

    [Fact]
    public async Task UpdateStatus_RepeatedTerminalStatusDoesNotChangeProgress()
    {
        // A stale-failed job keeps its recorded progress when its aborted pipeline later reports FAILED.
        var jobId = await SeedJobAsync("FAILED", 55);

        Assert.True(await _jobs.UpdateStatusAsync(jobId, "FAILED", 100, "error", "pipeline exited"));

        var job = await ReloadJobAsync(jobId);
        Assert.Equal(55, job.Progress);
        Assert.Equal(SeededUpdatedUtc, job.UpdatedUtc);
    }

    [Theory]
    [InlineData("QUEUED", "RUNNING")]
    [InlineData("RUNNING", "SUCCEEDED")]
    [InlineData("RUNNING", "FAILED")]
    [InlineData("RUNNING", "QUEUED")] // orphan re-queue after a restart
    [InlineData("INTERRUPTED", "QUEUED")] // re-queue after an API restart
    [InlineData("INTERRUPTED", "RUNNING")] // surviving pipeline reports progress after an API restart
    [InlineData("QUEUED", "FAILED")] // queue timeout / runner trigger failure
    public async Task UpdateStatus_AppliesNonTerminalTransitions(string fromStatus, string toStatus)
    {
        var jobId = await SeedJobAsync(fromStatus, 10);

        var applied = await _jobs.UpdateStatusAsync(jobId, toStatus, 50, "info", "transition", "abc1234");

        Assert.True(applied);
        var job = await ReloadJobAsync(jobId);
        Assert.Equal(toStatus, job.Status);
        Assert.Equal(50, job.Progress);
        Assert.Equal("abc1234", job.ExecutedWebGitCommitHash);
        Assert.Equal("transition", Assert.Single(await EventsAsync(jobId)).Message);
    }

    [Fact]
    public async Task UpdateStatus_KeepsRunningProgressMonotonic()
    {
        var jobId = await SeedJobAsync("RUNNING", 60);

        Assert.True(await _jobs.UpdateStatusAsync(jobId, "RUNNING", 30, "info", "out-of-order event"));

        Assert.Equal(60, (await ReloadJobAsync(jobId)).Progress);
    }

    [Fact]
    public async Task UpdateStatus_ReturnsFalseForUnknownJob()
    {
        Assert.False(await _jobs.UpdateStatusAsync("missing", "RUNNING", 5, "info", "x"));
        Assert.Empty(await _db.JobEvents.ToListAsync());
    }

    [Theory]
    [InlineData("CANCELLED")]
    [InlineData("FAILED")]
    [InlineData("SUCCEEDED")]
    public async Task StoreResult_IsIgnoredForTerminalJob(string terminalStatus)
    {
        var jobId = await SeedJobAsync(terminalStatus, 40);

        var stored = await _jobs.StoreResultAsync(jobId, new { truthPercentage = 80, confidence = 70 }, "# report");

        Assert.False(stored);
        var job = await ReloadJobAsync(jobId);
        Assert.Null(job.ResultJson);
        Assert.Null(job.ReportMarkdown);
        Assert.Null(job.TruthPercentage);
        Assert.Null(job.VerdictLabel);
        Assert.Equal($"Ignored result after terminal status {terminalStatus}", Assert.Single(await EventsAsync(jobId)).Message);
    }

    [Fact]
    public async Task StoreResult_StoresResultForRunningJob()
    {
        var jobId = await SeedJobAsync("RUNNING", 95);

        var stored = await _jobs.StoreResultAsync(jobId, new { truthPercentage = 80, confidence = 70 }, "# report");

        Assert.True(stored);
        var job = await ReloadJobAsync(jobId);
        Assert.NotNull(job.ResultJson);
        Assert.Equal("# report", job.ReportMarkdown);
        Assert.Equal(80, job.TruthPercentage);
        Assert.Equal(70, job.Confidence);
        Assert.Equal("MOSTLY-TRUE", job.VerdictLabel);
    }

    [Fact]
    public async Task Cancel_StaysCancelledThroughRunnerFollowUpWrites()
    {
        // Sequence observed in the job events: user cancel, late progress events, then the runner's
        // FAILED writes after the pipeline reaches its abort checkpoint.
        var jobId = await SeedJobAsync("RUNNING", 36);

        var cancelled = await _jobs.CancelJobAsync(jobId);
        Assert.Equal("CANCELLED", cancelled?.Status);

        Assert.False(await _jobs.UpdateStatusAsync(jobId, "RUNNING", 40, "info", "Extracting evidence..."));
        Assert.False(await _jobs.UpdateStatusAsync(jobId, "FAILED", 100, "error", $"Job {jobId} was cancelled"));
        Assert.False(await _jobs.StoreResultAsync(jobId, new { truthPercentage = 50 }, null));

        var job = await ReloadJobAsync(jobId);
        Assert.Equal("CANCELLED", job.Status);
        Assert.Equal(36, job.Progress);
        Assert.Null(job.ResultJson);
    }

    [Fact]
    public async Task Cancel_DoesNotChangeTerminalJob()
    {
        var jobId = await SeedJobAsync("SUCCEEDED", 100);

        var job = await _jobs.CancelJobAsync(jobId);

        Assert.Equal("SUCCEEDED", job?.Status);
        Assert.Empty(await EventsAsync(jobId));
    }
}
