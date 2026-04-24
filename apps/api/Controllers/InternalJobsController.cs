using System.Text.Json;
using FactHarbor.Api.Helpers;
using FactHarbor.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FactHarbor.Api.Controllers;

public sealed record StatusUpdateRequest(string status, int? progress, string level, string message, string? executedWebGitCommitHash = null);
public sealed record RunnerClaimRequest(int? maxConcurrency = null, string? executedWebGitCommitHash = null);
public sealed record ResultStoreRequest(object resultJson, string? reportMarkdown);

[ApiController]
[Route("internal/v1/jobs")]
public sealed class InternalJobsController : ControllerBase
{
    private readonly JobService _jobs;

    public InternalJobsController(JobService jobs)
    {
        _jobs = jobs;
    }

    [HttpPost("{jobId}/claim-runner")]
    public async Task<IActionResult> ClaimRunner(string jobId, [FromBody] RunnerClaimRequest req)
    {
        if (!AuthHelper.IsAdminKeyValid(Request)) return Unauthorized();

        var claim = await _jobs.TryClaimRunnerSlotAsync(
            jobId,
            req.maxConcurrency ?? 1,
            req.executedWebGitCommitHash);

        if (claim.reason == "not_found") return NotFound(new { claimed = false, reason = claim.reason });

        return Ok(new
        {
            claimed = claim.claimed,
            reason = claim.reason,
            status = claim.status,
            runningCount = claim.runningCount
        });
    }

    [HttpPut("{jobId}/status")]
    public async Task<IActionResult> PutStatus(string jobId, [FromBody] StatusUpdateRequest req)
    {
        if (!AuthHelper.IsAdminKeyValid(Request)) return Unauthorized();

        var status = (req.status ?? "RUNNING").Trim().ToUpperInvariant();
        await _jobs.UpdateStatusAsync(
            jobId,
            status,
            req.progress,
            req.level ?? "info",
            req.message ?? "",
            req.executedWebGitCommitHash);
        return Ok(new { ok = true });
    }

    [HttpPut("{jobId}/result")]
    public async Task<IActionResult> PutResult(string jobId, [FromBody] ResultStoreRequest req)
    {
        if (!AuthHelper.IsAdminKeyValid(Request)) return Unauthorized();

        await _jobs.StoreResultAsync(jobId, req.resultJson, req.reportMarkdown);
        return Ok(new { ok = true });
    }

    [HttpDelete("{jobId}")]
    public async Task<IActionResult> DeleteJob(string jobId)
    {
        if (!AuthHelper.IsAdminKeyValid(Request)) return Unauthorized();

        var job = await _jobs.GetJobAsync(jobId);
        if (job is null) return NotFound();
        if (job.Status == "RUNNING" || job.Status == "QUEUED")
            return BadRequest(new { error = $"Cannot delete job in {job.Status} state. Cancel it first." });

        var deleted = await _jobs.DeleteJobAsync(jobId);
        if (!deleted) return NotFound();

        return Ok(new { ok = true });
    }
}
