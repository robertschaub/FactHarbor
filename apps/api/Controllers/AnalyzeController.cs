using FactHarbor.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FactHarbor.Api.Controllers;

public sealed record CreateJobRequest(string inputType, string inputValue);
public sealed record CreateJobResponse(string jobId, string status);

[ApiController]
[Route("v1/analyze")]
public sealed class AnalyzeController : ControllerBase
{
    private readonly JobService _jobs;
    private readonly RunnerClient _runner;

    public AnalyzeController(JobService jobs, RunnerClient runner)
    {
        _jobs = jobs;
        _runner = runner;
    }

    [HttpPost]
    public async Task<ActionResult<CreateJobResponse>> Create([FromBody] CreateJobRequest req, CancellationToken ct)
    {
        var it = req.inputType?.Trim().ToLowerInvariant();
        if (it is not ("text" or "url")) return BadRequest("inputType must be 'text' or 'url'");
        if (string.IsNullOrWhiteSpace(req.inputValue)) return BadRequest("inputValue required");

        var job = await _jobs.CreateJobAsync(it, req.inputValue);

        // Trigger runner (best-effort)
        _ = Task.Run(async () =>
        {
            try
            {
                await _jobs.UpdateStatusAsync(job.JobId, "QUEUED", 0, "info", "Triggering runner");
                await _runner.TriggerRunnerAsync(job.JobId);
            }
            catch (Exception ex)
            {
                await _jobs.UpdateStatusAsync(job.JobId, "FAILED", 100, "error", $"Runner trigger failed: {ex.Message}");
            }
        }, ct);

        return Ok(new CreateJobResponse(job.JobId, job.Status));
    }
}
