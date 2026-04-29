using FactHarbor.Api.Helpers;
using FactHarbor.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Logging;

namespace FactHarbor.Api.Controllers;

public sealed record CreateJobRequest(
    string inputType,
    string inputValue,
    string? pipelineVariant = "claimboundary",
    string? inviteCode = null
);
public sealed record CreateJobResponse(string jobId, string status);

[ApiController]
[Route("v1/analyze")]
public sealed class AnalyzeController : ControllerBase
{
    private readonly JobService _jobs;
    private readonly RunnerClient _runner;
    private readonly IServiceScopeFactory? _scopeFactory;
    private readonly ILogger<AnalyzeController>? _log;

    // constructor that supports safe background trigger + logging
    public AnalyzeController(JobService jobs, RunnerClient runner, IServiceScopeFactory scopeFactory, ILogger<AnalyzeController> log)
    {
        _jobs = jobs;
        _runner = runner;
        _scopeFactory = scopeFactory;
        _log = log;
    }

    [HttpGet("status")]
    [EnableRateLimiting("ReadPerIp")]
    public async Task<IActionResult> GetStatus()
    {
        var code = Request.Headers["X-Invite-Code"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(code))
            return BadRequest(new { error = "Invite code is required (send via X-Invite-Code header)" });

        var status = await _jobs.GetInviteCodeStatusAsync(code);
        if (status == null)
            return NotFound(new { error = "Invalid invite code" });

        return Ok(status);
    }

    private static (bool valid, string? error) ValidateRequest(CreateJobRequest req)
        => AnalyzeInputValidator.Validate(req.inputType, req.inputValue, req.pipelineVariant);

    [HttpPost]
    [EnableRateLimiting("AnalyzePerIp")]
    [RequestSizeLimit(65_536)]
    public async Task<ActionResult<CreateJobResponse>> Create([FromBody] CreateJobRequest req, CancellationToken ct)
    {
        // 0. Structural input validation (scheme, length, control chars)
        var (inputValid, inputError) = ValidateRequest(req);
        if (!inputValid) return BadRequest(new { error = inputError });

        // 1. Admins bypass invite code; everyone else must claim a slot
        var isAdmin = AuthHelper.IsAdminKeyValid(Request);
        if (!isAdmin)
        {
            var (claimed, error, contentionExhausted) = await _jobs.TryClaimInviteSlotAsync(req.inviteCode);
            if (!claimed)
            {
                if (contentionExhausted)
                    return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error });
                return BadRequest(new { error });
            }
        }

        // 2. Create Job
        var job = await _jobs.CreateJobAsync(
            req.inputType,
            req.inputValue,
            req.pipelineVariant ?? "claimboundary",
            req.inviteCode,
            submissionPath: "direct-api");

        // If we have scope factory + logger, do best-effort async trigger (POC-friendly).
        if (_scopeFactory is not null && _log is not null)
        {
            _ = TriggerRunnerBestEffortAsync(job.JobId);
        }
        else
        {
            // Fallback: trigger synchronously using request-scoped services
            await _jobs.UpdateStatusAsync(job.JobId, "QUEUED", 0, "info", "Triggering runner");
            await _runner.TriggerRunnerAsync(job.JobId);
        }

        return Ok(new CreateJobResponse(job.JobId, job.Status));
    }

    private async Task TriggerRunnerBestEffortAsync(string jobId)
    {
        // _scopeFactory and _log are not null here (guarded by caller)
        using var scope = _scopeFactory!.CreateScope();
        var jobs = scope.ServiceProvider.GetRequiredService<JobService>();
        var runner = scope.ServiceProvider.GetRequiredService<RunnerClient>();

        try
        {
            await jobs.UpdateStatusAsync(jobId, "QUEUED", 0, "info", "Triggering runner");

            // RunnerClient now handles retries with exponential backoff internally
            await runner.TriggerRunnerAsync(jobId);
        }
        catch (RunnerTriggerException ex)
        {
            // RunnerClient exhausted all retries
            _log!.LogError(ex, "Runner trigger failed after {Attempts} attempts. JobId={JobId}", ex.Attempts, jobId);

            try
            {
                await jobs.UpdateStatusAsync(jobId, "FAILED", 100, "error", $"Runner trigger failed after {ex.Attempts} attempts: {ex.InnerException?.Message ?? ex.Message}");
            }
            catch (Exception ex2)
            {
                _log!.LogError(ex2, "Failed to write FAILED status for JobId={JobId}", jobId);
            }
        }
        catch (Exception ex)
        {
            _log!.LogError(ex, "Runner trigger failed unexpectedly. JobId={JobId}", jobId);

            try
            {
                await jobs.UpdateStatusAsync(jobId, "FAILED", 100, "error", $"Runner trigger failed: {ex.Message}");
            }
            catch (Exception ex2)
            {
                _log!.LogError(ex2, "Failed to write FAILED status for JobId={JobId}", jobId);
            }
        }
    }
}
