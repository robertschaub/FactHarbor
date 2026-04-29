using System.Text.Json;
using System.Data;
using FactHarbor.Api.Data;
using FactHarbor.Api.Helpers;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace FactHarbor.Api.Services;

public sealed class JobService
{
    private const int AbsoluteClaimSelectionCap = 5;

    private readonly FhDbContext _db;
    private readonly ILogger<JobService> _log;
    private readonly AppBuildInfo _buildInfo;

    public JobService(FhDbContext db, ILogger<JobService> log, AppBuildInfo buildInfo)
    {
        _db = db;
        _log = log;
        _buildInfo = buildInfo;
    }

    private static string NormalizeStatus(string? status)
        => (status ?? "").Trim().ToUpperInvariant();

    private static bool IsTerminalStatus(string? status)
    {
        return NormalizeStatus(status) switch
        {
            "SUCCEEDED" or "FAILED" or "CANCELLED" => true,
            _ => false,
        };
    }

    private static string GetDraftSubmissionPath(string? selectionMode)
        => string.Equals(selectionMode, "automatic", StringComparison.OrdinalIgnoreCase)
            ? "acs-automatic-draft"
            : "acs-interactive-draft";

    public async Task<JobEntity> CreateJobAsync(
        string inputType,
        string inputValue,
        string pipelineVariant = "claimboundary",
        string? inviteCode = null,
        string submissionPath = "direct-api")
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
            SubmissionPath = submissionPath,
            GitCommitHash = _buildInfo.GetGitCommitHash(useCache: false),
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

    public async Task<List<JobEntity>> ListJobsAsync(int skip = 0, int take = 1000, bool includeHidden = false, string? gitHash = null)
    {
        var q = _db.Jobs.AsQueryable();
        if (!includeHidden) q = q.Where(x => !x.IsHidden);
        if (!string.IsNullOrWhiteSpace(gitHash))
            q = q.Where(x =>
                (x.GitCommitHash != null && x.GitCommitHash.StartsWith(gitHash)) ||
                (x.ExecutedWebGitCommitHash != null && x.ExecutedWebGitCommitHash.StartsWith(gitHash)));
        return await q.OrderByDescending(x => x.CreatedUtc).Skip(skip).Take(take).ToListAsync();
    }

    public async Task<int> CountJobsAsync(bool includeHidden = false, string? gitHash = null)
    {
        var q = _db.Jobs.AsQueryable();
        if (!includeHidden) q = q.Where(x => !x.IsHidden);
        if (!string.IsNullOrWhiteSpace(gitHash))
            q = q.Where(x =>
                (x.GitCommitHash != null && x.GitCommitHash.StartsWith(gitHash)) ||
                (x.ExecutedWebGitCommitHash != null && x.ExecutedWebGitCommitHash.StartsWith(gitHash)));
        return await q.CountAsync();
    }

    public async Task<JobEntity?> SetHiddenAsync(string jobId, bool hidden)
    {
        var job = await _db.Jobs.FindAsync(jobId);
        if (job is null) return null;
        job.IsHidden = hidden;
        job.UpdatedUtc = DateTime.UtcNow;
        _db.JobEvents.Add(new JobEventEntity
        {
            JobId = jobId,
            Level = "info",
            Message = hidden ? "Report hidden by admin" : "Report unhidden by admin",
            TsUtc = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        return job;
    }

    public async Task AddEventAsync(string jobId, string level, string message)
    {
        _db.JobEvents.Add(new JobEventEntity { JobId = jobId, Level = level, Message = message, TsUtc = DateTime.UtcNow });
        await _db.SaveChangesAsync();
    }

    public async Task<(bool claimed, string reason, string? status, int runningCount)> TryClaimRunnerSlotAsync(
        string jobId,
        int maxConcurrency,
        string? executedWebGitCommitHash = null)
    {
        var concurrencyLimit = Math.Max(1, maxConcurrency);
        await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        var job = await _db.Jobs.FirstOrDefaultAsync(x => x.JobId == jobId);
        if (job is null)
        {
            return (false, "not_found", null, 0);
        }

        var status = (job.Status ?? "").Trim().ToUpperInvariant();
        if (status != "QUEUED")
        {
            return (false, "not_queued", status, 0);
        }

        var runningCount = await _db.Jobs.CountAsync(x => x.Status == "RUNNING");
        if (runningCount >= concurrencyLimit)
        {
            return (false, "capacity_full", status, runningCount);
        }

        job.Status = "RUNNING";
        job.Progress = 1;
        if (!string.IsNullOrWhiteSpace(executedWebGitCommitHash))
            job.ExecutedWebGitCommitHash = executedWebGitCommitHash.Trim().ToLowerInvariant();
        job.UpdatedUtc = DateTime.UtcNow;

        _db.JobEvents.Add(new JobEventEntity
        {
            JobId = jobId,
            Level = "info",
            Message = "Runner started",
            TsUtc = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return (true, "claimed", "RUNNING", runningCount + 1);
    }

    public async Task UpdateStatusAsync(
        string jobId,
        string status,
        int? progress,
        string level,
        string message,
        string? executedWebGitCommitHash = null)
    {
        var job = await GetJobAsync(jobId);
        if (job is null) return;
        var requestedStatus = NormalizeStatus(status);
        if (string.IsNullOrWhiteSpace(requestedStatus))
            requestedStatus = "RUNNING";

        // Enforce monotonic progress for RUNNING→RUNNING updates to prevent
        // out-of-order async events from making progress appear to go backward.
        // Terminal states and restarts (which change status) set progress directly.
        var previousStatus = NormalizeStatus(job.Status);
        if (IsTerminalStatus(previousStatus) && requestedStatus != previousStatus)
        {
            _db.JobEvents.Add(new JobEventEntity
            {
                JobId = jobId,
                Level = "info",
                Message = $"Ignored status update after terminal status {previousStatus}: requested {requestedStatus} ({message})",
                TsUtc = DateTime.UtcNow,
            });
            await _db.SaveChangesAsync();
            return;
        }

        job.Status = requestedStatus;
        if (progress.HasValue)
        {
            var isMonotonicViolation = requestedStatus == "RUNNING" && previousStatus == "RUNNING"
                                      && progress.Value < job.Progress;
            if (!isMonotonicViolation)
                job.Progress = progress.Value;
        }
        if (!string.IsNullOrWhiteSpace(executedWebGitCommitHash))
            job.ExecutedWebGitCommitHash = executedWebGitCommitHash.Trim().ToLowerInvariant();
        job.UpdatedUtc = DateTime.UtcNow;

        _db.JobEvents.Add(new JobEventEntity { JobId = jobId, Level = level, Message = message, TsUtc = DateTime.UtcNow });
        await _db.SaveChangesAsync();
    }

    public async Task StoreResultAsync(string jobId, object resultJson, string? reportMarkdown)
    {
        var job = await GetJobAsync(jobId);
        if (job is null) return;
        var previousStatus = NormalizeStatus(job.Status);
        if (IsTerminalStatus(previousStatus))
        {
            _db.JobEvents.Add(new JobEventEntity
            {
                JobId = jobId,
                Level = "info",
                Message = $"Ignored result store after terminal status {previousStatus}",
                TsUtc = DateTime.UtcNow,
            });
            await _db.SaveChangesAsync();
            return;
        }

        var jsonOptions = new JsonSerializerOptions { WriteIndented = true, PropertyNameCaseInsensitive = true };
        job.ResultJson = JsonSerializer.Serialize(resultJson, jsonOptions);
        job.ReportMarkdown = reportMarkdown;
        job.UpdatedUtc = DateTime.UtcNow;

        // Extract verdict for quick display in lists
        try
        {
            var doc = JsonDocument.Parse(job.ResultJson);
            var root = doc.RootElement;

            // Try multiple paths to find the overall truth percentage and confidence.
            // ClaimBoundary pipeline: top-level truthPercentage + confidence
            // Dynamic pipeline: verdictSummary.overallVerdict + verdictSummary.overallConfidence
            // Legacy formats: articleAnalysis, twoPanelSummary
            int? truthPct = null;
            int? confidence = null;

            if (root.TryGetProperty("truthPercentage", out var tpProp) && tpProp.ValueKind == JsonValueKind.Number)
                truthPct = (int)tpProp.GetDouble();
            else if (root.TryGetProperty("verdictSummary", out var vsProp) && vsProp.TryGetProperty("overallVerdict", out var vsOvProp) && vsOvProp.ValueKind == JsonValueKind.Number)
                truthPct = (int)vsOvProp.GetDouble();
            else if (root.TryGetProperty("articleAnalysis", out var aaProp) && aaProp.TryGetProperty("articleTruthPercentage", out var atpProp) && atpProp.ValueKind == JsonValueKind.Number)
                truthPct = (int)atpProp.GetDouble();
            else if (root.TryGetProperty("twoPanelSummary", out var tpsProp) && tpsProp.TryGetProperty("factharborAnalysis", out var faProp) && faProp.TryGetProperty("overallVerdict", out var ovProp) && ovProp.ValueKind == JsonValueKind.Number)
                truthPct = (int)ovProp.GetDouble();

            if (root.TryGetProperty("confidence", out var cProp) && cProp.ValueKind == JsonValueKind.Number)
                confidence = (int)cProp.GetDouble();
            else if (root.TryGetProperty("verdictSummary", out var vsProp2) && vsProp2.TryGetProperty("overallConfidence", out var vsConfProp) && vsConfProp.ValueKind == JsonValueKind.Number)
                confidence = (int)vsConfProp.GetDouble();
            else if (root.TryGetProperty("twoPanelSummary", out var tpsProp2) && tpsProp2.TryGetProperty("factharborAnalysis", out var faProp2) && faProp2.TryGetProperty("confidence", out var cProp2) && cProp2.ValueKind == JsonValueKind.Number)
                confidence = (int)cProp2.GetDouble();

            if (truthPct.HasValue)
            {
                job.TruthPercentage = truthPct.Value;
                job.VerdictLabel = MapPercentageToVerdict(truthPct.Value, confidence ?? 0);
            }
            job.Confidence = confidence;
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
        if (percentage >= 43) return confidence >= 45 ? "MIXED" : "UNVERIFIED";
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
    public async Task<(bool claimed, string? error, bool contentionExhausted)> TryClaimInviteSlotAsync(string? code)
    {
        if (string.IsNullOrWhiteSpace(code)) return (false, "Invite code required", false);

        const int maxRetries = 3;
        var backoffMs = new[] { 50, 100, 200 };

        for (var attempt = 0; attempt <= maxRetries; attempt++)
        {
            try
            {
                using var tx = await _db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
                try
                {
                    var invite = await _db.InviteCodes.FindAsync(code);
                    if (invite == null)    { await tx.RollbackAsync(); return (false, "Invalid invite code", false); }
                    if (!invite.IsActive)  { await tx.RollbackAsync(); return (false, "Invite code is disabled", false); }
                    if (invite.ExpiresUtc.HasValue && invite.ExpiresUtc.Value < DateTime.UtcNow)
                        { await tx.RollbackAsync(); return (false, "Invite code has expired", false); }
                    if (invite.UsedJobs >= invite.MaxJobs)
                        { await tx.RollbackAsync(); return (false, $"Lifetime limit reached ({invite.MaxJobs} total)", false); }

                    // Hourly limit check (rolling 60-minute window)
                    if (invite.HourlyLimit > 0)
                    {
                        var hourCutoff = DateTime.UtcNow.AddHours(-1);
                        var hourlyUsed = await _db.Jobs.CountAsync(j =>
                            j.InviteCode == code &&
                            j.CreatedUtc >= hourCutoff &&
                            j.ClaimSelectionDraftId == null);
                        if (hourlyUsed >= invite.HourlyLimit)
                            { await tx.RollbackAsync(); return (false, $"Hourly limit reached ({invite.HourlyLimit}/hour). Try again in a few minutes.", false); }
                    }

                    var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);
                    if (invite.DailyLimit > 0)
                    {
                        var usage = await _db.InviteCodeUsage.FindAsync(code, today);
                        if (usage != null && usage.UsageCount >= invite.DailyLimit)
                            { await tx.RollbackAsync(); return (false, $"Daily limit reached ({invite.DailyLimit}/day). Try again after midnight UTC.", false); }
                    }

                    // All checks passed — apply increments.
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
                    return (true, null, false);
                }
                catch
                {
                    await tx.RollbackAsync();
                    throw;
                }
            }
            catch (SqliteException ex) when (ex.SqliteErrorCode == 5)
            {
                if (attempt == maxRetries)
                {
                    _log.LogError(
                        ex,
                        "Invite slot claim failed after {Retries} retries due to SQLite contention. Code={InviteCode}",
                        maxRetries,
                        code);
                    return (false, "Service temporarily unavailable due to database contention. Please retry.", true);
                }

                var delay = backoffMs[attempt];
                _log.LogWarning(
                    ex,
                    "SQLite contention while claiming invite slot. Attempt={Attempt}/{MaxRetries}, DelayMs={DelayMs}, Code={InviteCode}",
                    attempt + 1,
                    maxRetries,
                    delay,
                    code);
                await Task.Delay(delay);
            }
        }

        return (false, "Service temporarily unavailable due to database contention. Please retry.", true);
    }

    /// <summary>
    /// Case-insensitive LIKE search across InputValue and InputPreview.
    /// Acceptable at POC scale (~10k jobs); revisit with FTS5 at larger scale.
    /// </summary>
    public async Task<(List<JobEntity> items, int totalCount)> SearchJobsAsync(
        string query, int skip = 0, int take = 50, bool includeHidden = false)
    {
        var q = $"%{query.Trim()}%";
        var baseQuery = _db.Jobs.Where(j =>
            EF.Functions.Like(j.InputValue, q) ||
            EF.Functions.Like(j.InputPreview ?? "", q));

        if (!includeHidden) baseQuery = baseQuery.Where(j => !j.IsHidden);

        var total = await baseQuery.CountAsync();
        var items = await baseQuery
            .OrderByDescending(x => x.CreatedUtc)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return (items, total);
    }

    #region Invite Code Management (Admin & Status)

    public async Task<List<InviteCodeEntity>> ListInviteCodesAsync()
        => await _db.InviteCodes.OrderByDescending(x => x.CreatedUtc).ToListAsync();

    public async Task<InviteCodeEntity?> GetInviteCodeAsync(string code)
        => await _db.InviteCodes.FindAsync(code);

    public async Task<InviteCodeEntity> CreateInviteCodeAsync(InviteCodeEntity invite)
    {
        _db.InviteCodes.Add(invite);
        await _db.SaveChangesAsync();
        return invite;
    }

    public async Task<bool> DeactivateInviteCodeAsync(string code)
    {
        var invite = await _db.InviteCodes.FindAsync(code);
        if (invite == null) return false;
        invite.IsActive = false;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteInviteCodeAsync(string code)
    {
        var invite = await _db.InviteCodes.FindAsync(code);
        if (invite == null) return false;

        // Clean up usage history
        var usages = await _db.InviteCodeUsage.Where(u => u.InviteCode == code).ToListAsync();
        _db.InviteCodeUsage.RemoveRange(usages);

        _db.InviteCodes.Remove(invite);
        await _db.SaveChangesAsync();
        return true;
    }

    public sealed record InviteCodeStatus(
        string code,
        bool isActive,
        int hourlyLimit,
        int hourlyUsed,
        int hourlyRemaining,
        int dailyLimit,
        int dailyUsed,
        int dailyRemaining,
        int lifetimeLimit,
        int lifetimeUsed,
        int lifetimeRemaining,
        DateTime? expiresUtc
    );

    public async Task<InviteCodeStatus?> GetInviteCodeStatusAsync(string code)
    {
        var invite = await _db.InviteCodes.FindAsync(code);
        if (invite == null) return null;

        var hourCutoff = DateTime.UtcNow.AddHours(-1);
        var hourlyDirectJobs = await _db.Jobs.CountAsync(j =>
            j.InviteCode == code &&
            j.CreatedUtc >= hourCutoff &&
            j.ClaimSelectionDraftId == null);
        var hourlyDrafts = await _db.ClaimSelectionDrafts.CountAsync(d => d.InviteCode == code && d.CreatedUtc >= hourCutoff);
        var hourlyUsed = hourlyDirectJobs + hourlyDrafts;

        var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);
        var usage = await _db.InviteCodeUsage.FindAsync(code, today);
        var dailyUsed = usage?.UsageCount ?? 0;

        return new InviteCodeStatus(
            invite.Code,
            invite.IsActive,
            invite.HourlyLimit,
            hourlyUsed,
            invite.HourlyLimit > 0 ? Math.Max(0, invite.HourlyLimit - hourlyUsed) : 999,
            invite.DailyLimit,
            dailyUsed,
            invite.DailyLimit > 0 ? Math.Max(0, invite.DailyLimit - dailyUsed) : 999,
            invite.MaxJobs,
            invite.UsedJobs,
            Math.Max(0, invite.MaxJobs - invite.UsedJobs),
            invite.ExpiresUtc
        );
    }

    public sealed record InviteCodeUsageDay(DateTime date, int count);

    public async Task<List<InviteCodeUsageDay>> GetInviteCodeUsageHistoryAsync(string code)
    {
        return await _db.InviteCodeUsage
            .Where(u => u.InviteCode == code)
            .OrderByDescending(u => u.Date)
            .Select(u => new InviteCodeUsageDay(u.Date, u.UsageCount))
            .ToListAsync();
    }

    public async Task<InviteCodeEntity?> UpdateInviteCodeAsync(
        string code,
        string? description,
        int? maxJobs,
        int? hourlyLimit,
        int? dailyLimit,
        DateTime? expiresUtc,
        bool? isActive,
        bool clearExpiration)
    {
        var invite = await _db.InviteCodes.FindAsync(code);
        if (invite == null) return null;

        if (description != null) invite.Description = description;
        if (maxJobs.HasValue) invite.MaxJobs = maxJobs.Value;
        if (hourlyLimit.HasValue) invite.HourlyLimit = hourlyLimit.Value;
        if (dailyLimit.HasValue) invite.DailyLimit = dailyLimit.Value;
        if (expiresUtc.HasValue) invite.ExpiresUtc = expiresUtc.Value;
        else if (clearExpiration) invite.ExpiresUtc = null;
        if (isActive.HasValue) invite.IsActive = isActive.Value;

        await _db.SaveChangesAsync();
        return invite;
    }

    #endregion

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
            PreparedStage1Json = originalJob.PreparedStage1Json,
            ClaimSelectionJson = originalJob.ClaimSelectionJson,
            SubmissionPath = "retry",
            GitCommitHash = _buildInfo.GetGitCommitHash(useCache: false),  // Current build hash at retry creation time
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

    public async Task<(JobEntity? job, string? error)> CreateJobFromDraftAsync(
        Data.ClaimSelectionDraftEntity draft,
        string[] selectedClaimIds)
    {
        var existingJob = await _db.Jobs.FirstOrDefaultAsync(j => j.ClaimSelectionDraftId == draft.DraftId);
        if (existingJob is not null)
            return (existingJob, null);

        string? preparedStage1Json = null;
        var rankedClaimIds = Array.Empty<string>();
        var recommendedClaimIds = Array.Empty<string>();
        var deferredClaimIds = Array.Empty<string>();
        int? selectionCap = null;
        int? selectionAdmissionCap = null;
        string? recommendationRationale = null;
        string? budgetFitRationale = null;
        var assessments = Array.Empty<object>();

        if (!string.IsNullOrWhiteSpace(draft.DraftStateJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(draft.DraftStateJson);
                var root = doc.RootElement;
                if (root.TryGetProperty("preparedStage1", out var preparedProp) && preparedProp.ValueKind == JsonValueKind.Object)
                    preparedStage1Json = preparedProp.GetRawText();
                if (root.TryGetProperty("rankedClaimIds", out var rp) && rp.ValueKind == JsonValueKind.Array)
                    rankedClaimIds = rp.EnumerateArray().Select(e => e.GetString() ?? "").Where(s => s.Length > 0).ToArray();
                if (root.TryGetProperty("recommendedClaimIds", out var rcp) && rcp.ValueKind == JsonValueKind.Array)
                    recommendedClaimIds = rcp.EnumerateArray().Select(e => e.GetString() ?? "").Where(s => s.Length > 0).ToArray();
                if (root.TryGetProperty("deferredClaimIds", out var dcp) && dcp.ValueKind == JsonValueKind.Array)
                    deferredClaimIds = dcp.EnumerateArray().Select(e => e.GetString() ?? "").Where(s => s.Length > 0).ToArray();
                if (root.TryGetProperty("selectionCap", out var scp) &&
                    scp.ValueKind == JsonValueKind.Number &&
                    scp.TryGetInt32(out var parsedSelectionCap))
                {
                    selectionCap = parsedSelectionCap;
                }
                if (root.TryGetProperty("selectionAdmissionCap", out var sap) &&
                    sap.ValueKind == JsonValueKind.Number &&
                    sap.TryGetInt32(out var parsedSelectionAdmissionCap))
                {
                    selectionAdmissionCap = parsedSelectionAdmissionCap;
                }
                if (root.TryGetProperty("recommendationRationale", out var rrp) && rrp.ValueKind == JsonValueKind.String)
                    recommendationRationale = rrp.GetString();
                if (root.TryGetProperty("budgetFitRationale", out var bfrp) && bfrp.ValueKind == JsonValueKind.String)
                    budgetFitRationale = bfrp.GetString();
                if (root.TryGetProperty("assessments", out var ap) && ap.ValueKind == JsonValueKind.Array)
                    assessments = ap.EnumerateArray().Select(e => (object)e.GetRawText()).ToArray();
            }
            catch (JsonException) { }
        }

        if (string.IsNullOrWhiteSpace(preparedStage1Json))
            return (null, "Draft is missing preparedStage1 snapshot");

        var structuralSelectionCap = Math.Clamp(selectionCap ?? AbsoluteClaimSelectionCap, 1, AbsoluteClaimSelectionCap);
        var structuralAdmissionCap = Math.Clamp(selectionAdmissionCap ?? structuralSelectionCap, 1, structuralSelectionCap);
        var effectiveSelectionCap = rankedClaimIds.Length > 0
            ? Math.Min(rankedClaimIds.Length, structuralAdmissionCap)
            : structuralAdmissionCap;
        effectiveSelectionCap = Math.Max(1, effectiveSelectionCap);

        if (selectedClaimIds.Length < 1 || selectedClaimIds.Length > effectiveSelectionCap)
            return (null, effectiveSelectionCap == 1
                ? "Must select exactly 1 claim"
                : $"Must select between 1 and {effectiveSelectionCap} claims");

        if (selectedClaimIds.Length != selectedClaimIds.Distinct().Count())
            return (null, "Duplicate claim IDs");

        if (rankedClaimIds.Length > 0)
        {
            var rankedClaimIdSet = rankedClaimIds.ToHashSet(StringComparer.Ordinal);
            var invalid = selectedClaimIds.Where(id => !rankedClaimIdSet.Contains(id)).ToArray();
            if (invalid.Length > 0)
                return (null, $"Selected claim IDs not in candidate set: {string.Join(", ", invalid)}");
        }

        // Build assessments as raw JSON array elements for proper serialization
        var assessmentJsonElements = new List<object>();
        foreach (var a in assessments)
        {
            if (a is string raw)
                assessmentJsonElements.Add(JsonSerializer.Deserialize<object>(raw)!);
            else
                assessmentJsonElements.Add(a);
        }

        var selectionJson = JsonSerializer.Serialize(new
        {
            version = 1,
            selectionMode = draft.SelectionMode,
            restartedViaOther = draft.RestartedViaOther,
            restartCount = draft.RestartCount,
            selectionCap,
            selectionAdmissionCap,
            rankedClaimIds,
            recommendedClaimIds,
            deferredClaimIds,
            selectedClaimIds,
            recommendationRationale,
            budgetFitRationale,
            assessments = assessmentJsonElements,
        }, new JsonSerializerOptions { WriteIndented = false });

        var job = new JobEntity
        {
            JobId = Guid.NewGuid().ToString("N"),
            Status = "QUEUED",
            Progress = 0,
            InputType = draft.ActiveInputType,
            InputValue = draft.ActiveInputValue,
            InputPreview = MakePreview(draft.ActiveInputType, draft.ActiveInputValue),
            PipelineVariant = draft.PipelineVariant,
            InviteCode = draft.InviteCode,
            ClaimSelectionDraftId = draft.DraftId,
            PreparedStage1Json = preparedStage1Json,
            ClaimSelectionJson = selectionJson,
            SubmissionPath = GetDraftSubmissionPath(draft.SelectionMode),
            IsHidden = draft.IsHidden,
            GitCommitHash = _buildInfo.GetGitCommitHash(useCache: false),
            CreatedUtc = DateTime.UtcNow,
            UpdatedUtc = DateTime.UtcNow,
        };

        _db.Jobs.Add(job);
        _db.JobEvents.Add(new JobEventEntity
        {
            JobId = job.JobId,
            Level = "info",
            Message = $"Job created from claim selection draft {draft.DraftId}",
            TsUtc = DateTime.UtcNow,
        });

        try
        {
            await _db.SaveChangesAsync();
            return (job, null);
        }
        catch (DbUpdateException ex) when (IsDraftJobUniqueConstraintViolation(ex))
        {
            _db.Entry(job).State = EntityState.Detached;

            var concurrentJob = await _db.Jobs.FirstOrDefaultAsync(j => j.ClaimSelectionDraftId == draft.DraftId);
            if (concurrentJob is not null)
                return (concurrentJob, null);

            throw;
        }
    }

    private static bool IsDraftJobUniqueConstraintViolation(DbUpdateException ex)
    {
        return ex.InnerException is SqliteException sqliteEx &&
               sqliteEx.SqliteErrorCode == 19 &&
               sqliteEx.Message.Contains("Jobs.ClaimSelectionDraftId", StringComparison.Ordinal);
    }

    private static string MakePreview(string inputType, string inputValue)
    {
        if (inputType == "url") return inputValue.Length > 140 ? inputValue[..140] : inputValue;
        var t = inputValue.Trim().Replace("\n", " ");
        return t.Length > 140 ? t[..140] + "…" : t;
    }
}
