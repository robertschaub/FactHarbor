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
    {
        // inputType must be "url" or "text"
        if (req.inputType != "url" && req.inputType != "text")
            return (false, "Invalid inputType: must be 'url' or 'text'");

        // pipelineVariant validation
        var validPipelines = new[] { "claimboundary" };
        if (req.pipelineVariant != null && !validPipelines.Contains(req.pipelineVariant))
            return (false, $"Invalid pipelineVariant: must be one of {string.Join(", ", validPipelines.Select(p => $"'{p}'"))}");

        // inputValue must be non-empty
        if (string.IsNullOrWhiteSpace(req.inputValue))
            return (false, "Input cannot be empty");

        // Max size limits
        const int maxTextChars = 32_000;
        const int maxUrlChars = 2_000;
        var maxChars = req.inputType == "url" ? maxUrlChars : maxTextChars;
        if (req.inputValue.Length > maxChars)
            return (false, $"Input too long: max {maxChars} characters allowed for {req.inputType} input");

        // URL scheme enforcement
        if (req.inputType == "url")
        {
            var url = req.inputValue.Trim();
            if (!url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
                !url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                return (false, "URL must use http or https scheme");
        }

        // Control character density check (allow \r \n \t; reject heavy binary/obfuscation payloads)
        var nonSpaceLen = req.inputValue.Count(c => !char.IsWhiteSpace(c));
        if (nonSpaceLen > 0)
        {
            var controlCount = req.inputValue.Count(c => char.IsControl(c) && c != '\r' && c != '\n' && c != '\t');
            if ((double)controlCount / nonSpaceLen > 0.05)
                return (false, "Input contains too many control characters");
        }

        // Prevent link-heavy free text (>3 embedded URLs is unusual for a factual claim)
        if (req.inputType == "text")
        {
            var urlMatches = System.Text.RegularExpressions.Regex.Matches(req.inputValue, @"https?://", System.Text.RegularExpressions.RegexOptions.None, TimeSpan.FromSeconds(1));
            if (urlMatches.Count > 3)
                return (false, "Free-text input may not contain more than 3 embedded URLs");
        }

        return (true, null);
    }

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
        var job = await _jobs.CreateJobAsync(req.inputType, req.inputValue, req.pipelineVariant ?? "claimboundary", req.inviteCode);

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
