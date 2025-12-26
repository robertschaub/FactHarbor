using FactHarbor.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;

namespace FactHarbor.Api.Controllers;

public sealed record CreateJobRequest(string inputType, string inputValue);
public sealed record CreateJobResponse(string jobId, string status);

[ApiController]
[Route("v1/analyze")]
public sealed class AnalyzeController : ControllerBase
{
    private readonly JobService _jobs;
    private readonly IServiceScopeFactory _scopeFactory;

    public AnalyzeController(JobService jobs, IServiceScopeFactory scopeFactory)
    {
        _jobs = jobs;
        _scopeFactory = scopeFactory;
    }

    [HttpPost]
    public async Task<ActionResult<CreateJobResponse>> Create([FromBody] CreateJobRequest req, CancellationToken ct)
    {
        var it = req.inputType?.Trim().ToLowerInvariant();
        if (it is not ("text" or "url")) return BadRequest("inputType must be 'text' or 'url'");
        if (string.IsNullOrWhiteSpace(req.inputValue)) return BadRequest("inputValue required");

        var job = await _jobs.CreateJobAsync(it, req.inputValue);

        // Trigger runner (best-effort)
        var jobId = job.JobId;
        _ = Task.Run(async () =>
        {
            using var scope = _scopeFactory.CreateScope();
            var jobs = scope.ServiceProvider.GetRequiredService<JobService>();
            var runner = scope.ServiceProvider.GetRequiredService<RunnerClient>();
            try
            {
                await jobs.UpdateStatusAsync(jobId, "QUEUED", 0, "info", "Triggering runner");
                await runner.TriggerRunnerAsync(jobId);
            }
            catch (Exception ex)
            {
                try
                {
                    await jobs.UpdateStatusAsync(jobId, "FAILED", 100, "error", $"Runner trigger failed: {ex.Message}");
                }
                catch
                {
                    // best-effort
                }
            }
        });

        return Ok(new CreateJobResponse(job.JobId, job.Status));
    }
}
