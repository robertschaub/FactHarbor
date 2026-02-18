using System.Text.Json;
using FactHarbor.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace FactHarbor.Api.Services;

public sealed class JobService
{
    private readonly FhDbContext _db;

    public JobService(FhDbContext db) { _db = db; }

    public async Task<JobEntity> CreateJobAsync(string inputType, string inputValue, string pipelineVariant = "orchestrated")
    {
        var job = new JobEntity
        {
            JobId = Guid.NewGuid().ToString("N"),
            Status = "QUEUED",
            Progress = 0,
            InputType = inputType,
            InputValue = inputValue,
            InputPreview = MakePreview(inputType, inputValue),
            PipelineVariant = pipelineVariant,
            CreatedUtc = DateTime.UtcNow,
            UpdatedUtc = DateTime.UtcNow
        };

        _db.Jobs.Add(job);
        _db.JobEvents.Add(new JobEventEntity { JobId = job.JobId, Level = "info", Message = "Job created" });

        await _db.SaveChangesAsync();
        return job;
    }

    public async Task<JobEntity?> GetJobAsync(string jobId)
        => await _db.Jobs.FirstOrDefaultAsync(x => x.JobId == jobId);

    public async Task<List<JobEntity>> ListJobsAsync(int skip = 0, int take = 1000)
        => await _db.Jobs.OrderByDescending(x => x.CreatedUtc).Skip(skip).Take(take).ToListAsync();

    public async Task AddEventAsync(string jobId, string level, string message)
    {
        _db.JobEvents.Add(new JobEventEntity { JobId = jobId, Level = level, Message = message, TsUtc = DateTime.UtcNow });
        await _db.SaveChangesAsync();
    }

    public async Task UpdateStatusAsync(string jobId, string status, int? progress, string level, string message)
    {
        var job = await GetJobAsync(jobId);
        if (job is null) return;

        job.Status = status;
        if (progress.HasValue) job.Progress = progress.Value;
        job.UpdatedUtc = DateTime.UtcNow;

        _db.JobEvents.Add(new JobEventEntity { JobId = jobId, Level = level, Message = message, TsUtc = DateTime.UtcNow });
        await _db.SaveChangesAsync();
    }

    public async Task StoreResultAsync(string jobId, object resultJson, string? reportMarkdown)
    {
        var job = await GetJobAsync(jobId);
        if (job is null) return;

        job.ResultJson = JsonSerializer.Serialize(resultJson, new JsonSerializerOptions { WriteIndented = true });
        job.ReportMarkdown = reportMarkdown;
        job.UpdatedUtc = DateTime.UtcNow;

        _db.JobEvents.Add(new JobEventEntity { JobId = jobId, Level = "info", Message = "Result stored", TsUtc = DateTime.UtcNow });
        await _db.SaveChangesAsync();
    }

    public async Task<JobEntity?> CancelJobAsync(string jobId)
    {
        var job = await _db.Jobs.FindAsync(jobId);
        if (job is null) return null;
        if (job.Status == "SUCCEEDED" || job.Status == "FAILED" || job.Status == "CANCELLED")
            return job;
        job.Status = "CANCELLED";
        job.UpdatedUtc = DateTime.UtcNow;
        _db.JobEvents.Add(new JobEventEntity {
            JobId = jobId, Level = "info", Message = "Job cancelled by user",
            TsUtc = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        return job;
    }

    public async Task<bool> DeleteJobAsync(string jobId)
    {
        var job = await _db.Jobs.FindAsync(jobId);
        if (job is null) return false;

        // Explicitly delete events to ensure no orphans (regardless of FK constraints)
        var events = await _db.JobEvents.Where(e => e.JobId == jobId).ToListAsync();
        _db.JobEvents.RemoveRange(events);

        _db.Jobs.Remove(job);
        await _db.SaveChangesAsync();

        return true;
    }

    /// <summary>
    /// Create a retry job from a failed job, optionally with a different pipeline variant.
    /// </summary>
    /// <param name="originalJobId">The job ID to retry</param>
    /// <param name="newPipelineVariant">Pipeline to use (null = use original pipeline)</param>
    /// <param name="retryReason">Optional user reason for retry</param>
    /// <returns>New retry job entity</returns>
    /// <exception cref="ArgumentException">If original job not found</exception>
    public async Task<JobEntity> CreateRetryJobAsync(
        string originalJobId,
        string? newPipelineVariant = null,
        string? retryReason = null)
    {
        var originalJob = await GetJobAsync(originalJobId);
        if (originalJob is null)
            throw new ArgumentException($"Job {originalJobId} not found", nameof(originalJobId));

        // Calculate retry count: if original was already a retry, increment its count
        var retryCount = (originalJob.RetryCount) + 1;

        // Root job: if original has ParentJobId, use it; otherwise original IS the root
        var rootJobId = originalJob.ParentJobId ?? originalJobId;

        var retryJob = new JobEntity
        {
            JobId = Guid.NewGuid().ToString("N"),
            Status = "QUEUED",
            Progress = 0,
            InputType = originalJob.InputType,
            InputValue = originalJob.InputValue,
            InputPreview = originalJob.InputPreview,
            PipelineVariant = newPipelineVariant ?? originalJob.PipelineVariant,
            ParentJobId = rootJobId,  // Always point to root
            RetryCount = retryCount,
            RetriedFromUtc = DateTime.UtcNow,
            RetryReason = retryReason,
            CreatedUtc = DateTime.UtcNow,
            UpdatedUtc = DateTime.UtcNow
        };

        _db.Jobs.Add(retryJob);
        _db.JobEvents.Add(new JobEventEntity
        {
            JobId = retryJob.JobId,
            Level = "info",
            Message = $"Retry job created from {originalJobId} (retry #{retryCount}, pipeline: {retryJob.PipelineVariant})",
            TsUtc = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return retryJob;
    }

    private static string MakePreview(string inputType, string inputValue)
    {
        if (inputType == "url") return inputValue.Length > 140 ? inputValue[..140] : inputValue;
        var t = inputValue.Trim().Replace("\n", " ");
        return t.Length > 140 ? t[..140] + "…" : t;
    }
}
