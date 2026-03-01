using System.Text.Json;
using FactHarbor.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace FactHarbor.Api.Services;

public sealed class JobService
{
    private readonly FhDbContext _db;

    public JobService(FhDbContext db) { _db = db; }

    public async Task<JobEntity> CreateJobAsync(string inputType, string inputValue, string pipelineVariant = "orchestrated", string? inviteCode = null)
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
            InviteCode = inviteCode,
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

        var jsonOptions = new JsonSerializerOptions { WriteIndented = true, PropertyNameCaseInsensitive = true };
        job.ResultJson = JsonSerializer.Serialize(resultJson, jsonOptions);
        job.ReportMarkdown = reportMarkdown;
        job.UpdatedUtc = DateTime.UtcNow;

        // Extract verdict for quick display in lists
        try
        {
            var doc = JsonDocument.Parse(job.ResultJson);
            var root = doc.RootElement;

            // Try multiple paths to find the overall truth percentage and confidence
            int? truthPct = null;
            int? confidence = null;

            if (root.TryGetProperty("truthPercentage", out var tpProp) && tpProp.ValueKind == JsonValueKind.Number)
                truthPct = (int)tpProp.GetDouble();
            else if (root.TryGetProperty("articleAnalysis", out var aaProp) && aaProp.TryGetProperty("articleTruthPercentage", out var atpProp) && atpProp.ValueKind == JsonValueKind.Number)
                truthPct = (int)atpProp.GetDouble();
            else if (root.TryGetProperty("twoPanelSummary", out var tpsProp) && tpsProp.TryGetProperty("factharborAnalysis", out var faProp) && faProp.TryGetProperty("overallVerdict", out var ovProp) && ovProp.ValueKind == JsonValueKind.Number)
                truthPct = (int)ovProp.GetDouble();

            if (root.TryGetProperty("confidence", out var cProp) && cProp.ValueKind == JsonValueKind.Number)
                confidence = (int)cProp.GetDouble();
            else if (root.TryGetProperty("twoPanelSummary", out var tpsProp2) && tpsProp2.TryGetProperty("factharborAnalysis", out var faProp2) && faProp2.TryGetProperty("confidence", out var cProp2) && cProp2.ValueKind == JsonValueKind.Number)
                confidence = (int)cProp2.GetDouble();

            if (truthPct.HasValue)
            {
                job.TruthPercentage = truthPct.Value;
                job.VerdictLabel = MapPercentageToVerdict(truthPct.Value, confidence ?? 0);
            }
        }
        catch (Exception ex)
        {
            _db.JobEvents.Add(new JobEventEntity { JobId = jobId, Level = "warn", Message = $"Failed to extract verdict: {ex.Message}", TsUtc = DateTime.UtcNow });
        }

        _db.JobEvents.Add(new JobEventEntity { JobId = jobId, Level = "info", Message = "Result stored", TsUtc = DateTime.UtcNow });
        await _db.SaveChangesAsync();
    }

    private static string MapPercentageToVerdict(int percentage, int confidence)
    {
        // Must match apps/web/src/lib/analyzer/truth-scale.ts
        // (percentageToClaimVerdict + VERDICT_BANDS + mixed confidence threshold).
        if (percentage >= 86) return "TRUE";
        if (percentage >= 72) return "MOSTLY-TRUE";
        if (percentage >= 58) return "LEANING-TRUE";
        if (percentage >= 43) return confidence >= 40 ? "MIXED" : "UNVERIFIED";
        if (percentage >= 29) return "LEANING-FALSE";
        if (percentage >= 15) return "MOSTLY-FALSE";
        return "FALSE";
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

    public async Task<(bool isValid, string? error)> ValidateInviteCodeAsync(string? code)
    {
        if (string.IsNullOrWhiteSpace(code)) return (false, "Invite code required");
        var invite = await _db.InviteCodes.FirstOrDefaultAsync(x => x.Code == code);
        if (invite == null) return (false, "Invalid invite code");
        if (!invite.IsActive) return (false, "Invite code is disabled");
        if (invite.ExpiresUtc.HasValue && invite.ExpiresUtc.Value < DateTime.UtcNow)
            return (false, "Invite code has expired");
        if (invite.UsedJobs >= invite.MaxJobs)
            return (false, $"Invite code lifetime limit reached ({invite.MaxJobs} total)");
        if (invite.DailyLimit > 0)
        {
            var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);
            var usage = await _db.InviteCodeUsage
                .FirstOrDefaultAsync(x => x.InviteCode == code && x.Date == today);
            if (usage != null && usage.UsageCount >= invite.DailyLimit)
                return (false, $"Daily limit reached ({invite.DailyLimit} analyses per day)");
        }
        return (true, null);
    }

    /// <summary>
    /// Atomically validates the invite code and claims one submission slot.
    /// IsolationLevel.Serializable maps to BEGIN IMMEDIATE in Microsoft.Data.Sqlite,
    /// which blocks concurrent writers for the duration of the transaction.
    /// </summary>
    public async Task<(bool claimed, string? error)> TryClaimInviteSlotAsync(string? code)
    {
        if (string.IsNullOrWhiteSpace(code)) return (false, "Invite code required");

        using var tx = await _db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        try
        {
            var invite = await _db.InviteCodes.FindAsync(code);
            if (invite == null)    { await tx.RollbackAsync(); return (false, "Invalid invite code"); }
            if (!invite.IsActive)  { await tx.RollbackAsync(); return (false, "Invite code is disabled"); }
            if (invite.ExpiresUtc.HasValue && invite.ExpiresUtc.Value < DateTime.UtcNow)
                { await tx.RollbackAsync(); return (false, "Invite code has expired"); }
            if (invite.UsedJobs >= invite.MaxJobs)
                { await tx.RollbackAsync(); return (false, $"Lifetime limit reached ({invite.MaxJobs} total)"); }

            var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);
            if (invite.DailyLimit > 0)
            {
                var usage = await _db.InviteCodeUsage.FindAsync(code, today);
                if (usage != null && usage.UsageCount >= invite.DailyLimit)
                    { await tx.RollbackAsync(); return (false, $"Daily limit reached ({invite.DailyLimit}/day)"); }
            }

            // All checks passed — apply increments
            invite.UsedJobs++;

            if (invite.DailyLimit > 0)
            {
                var usage = await _db.InviteCodeUsage.FindAsync(code, today);
                if (usage == null)
                    _db.InviteCodeUsage.Add(new InviteCodeUsageEntity
                        { InviteCode = code, Date = today, UsageCount = 1 });
                else
                    usage.UsageCount++;
            }

            await _db.SaveChangesAsync();
            await tx.CommitAsync();
            return (true, null);
        }
        catch { await tx.RollbackAsync(); throw; }
    }

    /// <summary>
    /// Case-insensitive LIKE search across InputValue and InputPreview.
    /// Acceptable at POC scale (~10k jobs); revisit with FTS5 at larger scale.
    /// </summary>
    public async Task<(List<JobEntity> items, int totalCount)> SearchJobsAsync(
        string query, int skip = 0, int take = 50)
    {
        var q = $"%{query.Trim()}%";
        var baseQuery = _db.Jobs.Where(j =>
            EF.Functions.Like(j.InputValue, q) ||
            EF.Functions.Like(j.InputPreview ?? "", q));

        var total = await baseQuery.CountAsync();
        var items = await baseQuery
            .OrderByDescending(x => x.CreatedUtc)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return (items, total);
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
            InviteCode = originalJob.InviteCode,  // Preserve for audit trail
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
