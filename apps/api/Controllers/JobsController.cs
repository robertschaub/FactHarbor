using System.Text.Json;
using FactHarbor.Api.Data;
using FactHarbor.Api.Helpers;
using FactHarbor.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace FactHarbor.Api.Controllers;

[ApiController]
[Route("v1/jobs")]
public sealed class JobsController : ControllerBase
{
    private readonly JobService _jobs;
    private readonly FhDbContext _db;
    private readonly RunnerClient _runner;
    private readonly ILogger<JobsController> _log;

    public JobsController(JobService jobs, FhDbContext db, RunnerClient runner, ILogger<JobsController> log)
    {
        _jobs = jobs;
        _db = db;
        _runner = runner;
        _log = log;
    }

    [HttpGet]
    [EnableRateLimiting("ReadPerIp")]
    public async Task<IActionResult> List(int? page = null, int? pageSize = null, string? q = null, string? gitHash = null)
    {
        // Admins always see hidden reports (visually marked); non-admins never do.
        var isAdmin = AuthHelper.IsAdminKeyValid(Request);

        var actualPage = page ?? 1;
        var actualPageSize = pageSize ?? 50;

        // gitHash filter is admin-only. Accept clean commit prefixes and local dirty build ids
        // like "{hash}+{wthash}" or "{hash}+dirty", while still rejecting obviously malformed input.
        var gitHashFilter = isAdmin ? NormalizeGitHashFilter(gitHash) : null;

        int totalCount;
        List<JobEntity> items;

        if (!string.IsNullOrWhiteSpace(q))
        {
            (items, totalCount) = await _jobs.SearchJobsAsync(q, (actualPage - 1) * actualPageSize, actualPageSize, includeHidden: isAdmin);
        }
        else
        {
            totalCount = await _jobs.CountJobsAsync(includeHidden: isAdmin, gitHash: gitHashFilter);
            items = await _jobs.ListJobsAsync((actualPage - 1) * actualPageSize, actualPageSize, includeHidden: isAdmin, gitHash: gitHashFilter);
        }

        return Ok(new
        {
            jobs = items.Select(j =>
            {
                var analysisIssue = ExtractPrimaryAnalysisIssue(j.ResultJson);
                var visibleGitCommitHash = j.ExecutedWebGitCommitHash ?? j.GitCommitHash;
                return new
                {
                jobId = j.JobId,
                status = j.Status,
                progress = j.Progress,
                createdUtc = j.CreatedUtc.ToString("o"),
                updatedUtc = j.UpdatedUtc.ToString("o"),
                inputType = j.InputType,
                inputPreview = j.InputPreview,
                pipelineVariant = j.PipelineVariant,
                verdictLabel = j.VerdictLabel,
                truthPercentage = j.TruthPercentage,
                confidence = j.Confidence,
                isHidden = j.IsHidden,
                analysisIssueCode = analysisIssue.code,
                analysisIssueMessage = analysisIssue.message,
                // Admin-only: execution-time commit hash when available, with legacy fallback.
                gitCommitHash = isAdmin ? visibleGitCommitHash : null
                };
            }),
            pagination = new
            {
                page = actualPage,
                pageSize = actualPageSize,
                totalCount = totalCount,
                totalPages = (int)Math.Ceiling(totalCount / (double)actualPageSize)
            }
        });
    }

    [HttpGet("{jobId}")]
    [EnableRateLimiting("ReadPerIp")]
    public async Task<IActionResult> Get(string jobId)
    {
        var isAdmin = AuthHelper.IsAdminKeyValid(Request);
        var readableJob = await ResolveReadableJobAsync(jobId, isAdmin);
        if (readableJob.error is not null)
            return readableJob.error;

        var j = readableJob.job!;

        object? resultObj = null;
        if (!string.IsNullOrWhiteSpace(j.ResultJson))
        {
            try { resultObj = JsonSerializer.Deserialize<object>(j.ResultJson); } catch { }
        }

        var analysisIssue = ExtractPrimaryAnalysisIssue(j.ResultJson);
        var visibleGitCommitHash = j.ExecutedWebGitCommitHash ?? j.GitCommitHash;

        return Ok(new
        {
            jobId = j.JobId,
            status = j.Status,
            progress = j.Progress,
            createdUtc = j.CreatedUtc.ToString("o"),
            updatedUtc = j.UpdatedUtc.ToString("o"),
            inputType = j.InputType,
            inputValue = j.InputValue,
            inputPreview = j.InputPreview,
            pipelineVariant = j.PipelineVariant,
            verdictLabel = j.VerdictLabel,
            truthPercentage = j.TruthPercentage,
            confidence = j.Confidence,
            isHidden = j.IsHidden,
            analysisIssueCode = analysisIssue.code,
            analysisIssueMessage = analysisIssue.message,
            // Admin-only diagnostic field: execution-time commit hash when available, with legacy fallback.
            gitCommitHash = isAdmin ? visibleGitCommitHash : null,
            claimSelectionDraftId = isAdmin ? j.ClaimSelectionDraftId : null,
            preparedStage1Json = isAdmin ? j.PreparedStage1Json : null,
            claimSelectionJson = isAdmin ? j.ClaimSelectionJson : null,
            resultJson = resultObj,
            reportMarkdown = j.ReportMarkdown
        });
    }

    [HttpPost("{jobId}/hide")]
    public async Task<IActionResult> HideJob(string jobId)
    {
        if (!AuthHelper.IsAdminKeyValid(Request))
            return Unauthorized(new { error = "Admin key required" });

        var job = await _jobs.SetHiddenAsync(jobId, true);
        if (job is null) return NotFound();
        return Ok(new { ok = true, isHidden = job.IsHidden });
    }

    [HttpPost("{jobId}/unhide")]
    public async Task<IActionResult> UnhideJob(string jobId)
    {
        if (!AuthHelper.IsAdminKeyValid(Request))
            return Unauthorized(new { error = "Admin key required" });

        var job = await _jobs.SetHiddenAsync(jobId, false);
        if (job is null) return NotFound();
        return Ok(new { ok = true, isHidden = job.IsHidden });
    }

    [HttpPost("{jobId}/cancel")]
    public async Task<IActionResult> CancelJob(string jobId)
    {
        if (!AuthHelper.IsAdminKeyValid(Request))
            return Unauthorized(new { error = "Admin key required" });

        var job = await _jobs.CancelJobAsync(jobId);
        if (job is null) return NotFound();

        // Try to abort on runner (best effort - job status is already CANCELLED in DB)
        if (job.Status == "CANCELLED")
        {
            await _runner.AbortJobAsync(jobId);
        }

        return Ok(new { ok = true, status = job.Status });
    }

    public sealed record RetryJobRequest(
        string? pipelineVariant = null,
        string? retryReason = null
    );

    /// <summary>
    /// Retry a failed job with optional pipeline variant change
    /// </summary>
    [HttpPost("{jobId}/retry")]
    public async Task<IActionResult> RetryJob(string jobId, [FromBody] RetryJobRequest? req)
    {
        if (!AuthHelper.IsAdminKeyValid(Request))
            return Unauthorized(new { error = "Admin key required" });

        var originalJob = await _jobs.GetJobAsync(jobId);
        if (originalJob is null)
            return NotFound(new { error = "Job not found" });

        // Validation: only FAILED jobs can be retried
        if (originalJob.Status != "FAILED")
        {
            return BadRequest(new
            {
                error = "Only FAILED jobs can be retried",
                currentStatus = originalJob.Status
            });
        }

        // Prevent excessive retries
        const int MAX_RETRY_DEPTH = 3;
        if (originalJob.RetryCount >= MAX_RETRY_DEPTH)
        {
            return BadRequest(new
            {
                error = $"Maximum retry depth ({MAX_RETRY_DEPTH}) exceeded",
                retryCount = originalJob.RetryCount
            });
        }

        var newPipelineVariant = req?.pipelineVariant ?? originalJob.PipelineVariant;
        var retryReason = req?.retryReason;

        try
        {
            // Retry jobs also consume invite quota, same as first-run submissions.
            var (claimed, claimError, contentionExhausted) =
                await _jobs.TryClaimInviteSlotAsync(originalJob.InviteCode);
            if (!claimed)
            {
                if (contentionExhausted)
                    return StatusCode(503, new { error = claimError });
                return BadRequest(new { error = claimError });
            }

            var retryJob = await _jobs.CreateRetryJobAsync(jobId, newPipelineVariant, retryReason);

            // Trigger runner (same pattern as AnalyzeController.Create)
            await _jobs.UpdateStatusAsync(retryJob.JobId, "QUEUED", 0, "info", "Triggering runner");
            await _runner.TriggerRunnerAsync(retryJob.JobId);

            return Ok(new
            {
                retryJobId = retryJob.JobId,
                originalJobId = jobId,
                pipelineVariant = retryJob.PipelineVariant,
                retryCount = retryJob.RetryCount,
                status = retryJob.Status
            });
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Failed to create/trigger retry job for {JobId}", jobId);
            return StatusCode(500, new
            {
                error = "Failed to create retry job",
                details = ex.Message
            });
        }
    }

    [HttpGet("{jobId}/events/history")]
    [EnableRateLimiting("ReadPerIp")]
    public async Task<IActionResult> EventHistory(string jobId)
    {
        var isAdmin = AuthHelper.IsAdminKeyValid(Request);
        var readableJob = await ResolveReadableJobAsync(jobId, isAdmin);
        if (readableJob.error is not null)
            return readableJob.error;

        var existing = await _db.JobEvents
            .Where(e => e.JobId == readableJob.job!.JobId)
            .OrderBy(e => e.Id)
            .ToListAsync();

        return Ok(existing.Select(e => new
        {
            id = e.Id,
            tsUtc = e.TsUtc.ToString("o"),
            level = e.Level,
            message = e.Message
        }));
    }

    [HttpGet("{jobId}/events")]
    [EnableRateLimiting("ReadPerIp")]
    public async Task EventsSse(string jobId)
    {
        var isAdmin = AuthHelper.IsAdminKeyValid(Request);
        var readableJob = await ResolveReadableJobAsync(jobId, isAdmin);
        if (readableJob.error is not null)
        {
            Response.StatusCode = readableJob.statusCode;
            Response.ContentType = "application/json";
            await Response.WriteAsJsonAsync(readableJob.payload);
            return;
        }

        var readableJobId = readableJob.job!.JobId;

        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");
        // Helps when running behind some proxies (best-effort; ignored elsewhere).
        Response.Headers.Append("X-Accel-Buffering", "no");

        long lastId = 0;

        // Replay existing events
        var existing = await _db.JobEvents.Where(e => e.JobId == readableJobId).OrderBy(e => e.Id).ToListAsync();
        foreach (var e in existing)
        {
            lastId = e.Id;
            await WriteEvent(e);
        }
        await Response.Body.FlushAsync();

        // Poll for new events (POC)
        var ct = HttpContext.RequestAborted;
        for (var i = 0; i < 300 && !ct.IsCancellationRequested; i++) // ~10 minutes at 2s interval
        {
            try
            {
                await Task.Delay(2000, ct);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            var next = await _db.JobEvents
                .Where(e => e.JobId == readableJobId && e.Id > lastId)
                .OrderBy(e => e.Id)
                .ToListAsync();

            foreach (var e in next)
            {
                lastId = e.Id;
                await WriteEvent(e);
            }
            await Response.Body.FlushAsync();
        }

        async Task WriteEvent(JobEventEntity e)
        {
            var payload = JsonSerializer.Serialize(new { id = e.Id, tsUtc = e.TsUtc.ToString("o"), level = e.Level, message = e.Message });
            await Response.WriteAsync($"data: {payload}\n\n");
        }
    }

    private async Task<(JobEntity? job, IActionResult? error, int statusCode, object? payload)> ResolveReadableJobAsync(string jobId, bool isAdmin)
    {
        if (!IsValidJobId(jobId))
        {
            var payload = new { error = "Invalid job ID" };
            return (null, BadRequest(payload), 400, payload);
        }

        var job = await _jobs.GetJobAsync(jobId);
        if (job is null)
        {
            var payload = new { error = "Job not found" };
            return (null, NotFound(payload), 404, payload);
        }

        // Report detail + event reads are public for non-hidden jobs; hidden jobs stay admin-only.
        if (job.IsHidden && !isAdmin)
        {
            var payload = new { error = "Job not found" };
            return (null, NotFound(payload), 404, payload);
        }

        return (job, null, 200, null);
    }

    private static (string? code, string? message) ExtractPrimaryAnalysisIssue(string? resultJson)
    {
        if (string.IsNullOrWhiteSpace(resultJson))
            return (null, null);

        try
        {
            using var doc = JsonDocument.Parse(resultJson);
            if (!doc.RootElement.TryGetProperty("analysisWarnings", out var warnings) ||
                warnings.ValueKind != JsonValueKind.Array)
            {
                return (null, null);
            }

            foreach (var warning in warnings.EnumerateArray())
            {
                if (!warning.TryGetProperty("type", out var typeProp) ||
                    typeProp.ValueKind != JsonValueKind.String)
                {
                    continue;
                }

                var type = typeProp.GetString();
                if (!string.Equals(type, "analysis_generation_failed", StringComparison.Ordinal))
                    continue;

                string? message = null;
                if (warning.TryGetProperty("message", out var messageProp) &&
                    messageProp.ValueKind == JsonValueKind.String)
                {
                    message = messageProp.GetString();
                }

                return (type, message);
            }
        }
        catch
        {
            // Keep list/detail responses resilient even when resultJson is malformed.
        }

        return (null, null);
    }

    private static string? NormalizeGitHashFilter(string? gitHash)
    {
        if (string.IsNullOrWhiteSpace(gitHash))
            return null;

        var trimmed = gitHash.Trim().ToLowerInvariant();
        var plusIndex = trimmed.IndexOf('+');
        if (plusIndex >= 0)
        {
            var baseHash = trimmed[..plusIndex];
            var suffix = trimmed[(plusIndex + 1)..];
            if (baseHash.Length < 7 || !baseHash.All(Uri.IsHexDigit))
                return null;
            if (suffix != "dirty" && (suffix.Length != 8 || !suffix.All(Uri.IsHexDigit)))
                return null;
            return trimmed;
        }

        if (trimmed.Length < 7 || trimmed.Length > 40 || !trimmed.All(Uri.IsHexDigit))
            return null;

        return trimmed;
    }

    private static bool IsValidJobId(string jobId)
    {
        if (string.IsNullOrWhiteSpace(jobId) || jobId.Length > 128)
            return false;

        return jobId.All(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_');
    }
}
