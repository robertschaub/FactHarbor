using System.Text.Json;
using FactHarbor.Api.Data;
using FactHarbor.Api.Services;
using Microsoft.AspNetCore.Mvc;
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
    public async Task<IActionResult> List(int? page = null, int? pageSize = null)
    {
        // Default to page 1, pageSize 50 if not provided
        var actualPage = page ?? 1;
        var actualPageSize = pageSize ?? 50;

        var totalCount = await _db.Jobs.CountAsync();
        var items = await _jobs.ListJobsAsync((actualPage - 1) * actualPageSize, actualPageSize);

        return Ok(new
        {
            jobs = items.Select(j => new
            {
                jobId = j.JobId,
                status = j.Status,
                progress = j.Progress,
                createdUtc = j.CreatedUtc.ToString("o"),
                updatedUtc = j.UpdatedUtc.ToString("o"),
                inputType = j.InputType,
                inputPreview = j.InputPreview,
                pipelineVariant = j.PipelineVariant
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
    public async Task<IActionResult> Get(string jobId)
    {
        var j = await _jobs.GetJobAsync(jobId);
        if (j is null) return NotFound();

        object? resultObj = null;
        if (!string.IsNullOrWhiteSpace(j.ResultJson))
        {
            try { resultObj = JsonSerializer.Deserialize<object>(j.ResultJson); } catch { }
        }

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
            resultJson = resultObj,
            reportMarkdown = j.ReportMarkdown
        });
    }

    [HttpPost("{jobId}/cancel")]
    public async Task<IActionResult> CancelJob(string jobId)
    {
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

    [HttpGet("{jobId}/events")]
    public async Task EventsSse(string jobId)
    {
        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");
        // Helps when running behind some proxies (best-effort; ignored elsewhere).
        Response.Headers.Append("X-Accel-Buffering", "no");

        long lastId = 0;

        // Replay existing events
        var existing = await _db.JobEvents.Where(e => e.JobId == jobId).OrderBy(e => e.Id).ToListAsync();
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
                .Where(e => e.JobId == jobId && e.Id > lastId)
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
}
