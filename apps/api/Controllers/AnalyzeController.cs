using FactHarbor.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace FactHarbor.Api.Controllers;

public sealed record CreateJobRequest(string inputType, string inputValue);
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

    [HttpPost]
    public async Task<ActionResult<CreateJobResponse>> Create([FromBody] CreateJobRequest req, CancellationToken ct)
    {
        var job = await _jobs.CreateJobAsync(req.inputType, req.inputValue);

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

            // One retry helps on local dev when the web runner is still starting up.
            for (var attempt = 1; attempt <= 2; attempt++)
            {
                try
                {
                    await runner.TriggerRunnerAsync(jobId);
                    return;
                }
                catch (Exception ex) when (attempt == 1)
                {
                    _log!.LogWarning(ex, "Runner trigger failed (attempt 1), retrying. JobId={JobId}", jobId);
                    await Task.Delay(1500);
                }
            }
        }
        catch (Exception ex)
        {
            _log!.LogError(ex, "Runner trigger failed. JobId={JobId}", jobId);

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
