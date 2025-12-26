using System.Text.Json;
using FactHarbor.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FactHarbor.Api.Controllers;

public sealed record StatusUpdateRequest(string status, int? progress, string level, string message);
public sealed record ResultStoreRequest(object resultJson, string? reportMarkdown);

[ApiController]
[Route("internal/v1/jobs")]
public sealed class InternalJobsController : ControllerBase
{
    private readonly JobService _jobs;
    private readonly IConfiguration _cfg;
    private readonly IWebHostEnvironment _env;

    public InternalJobsController(JobService jobs, IConfiguration cfg, IWebHostEnvironment env)
    {
        _jobs = jobs;
        _cfg = cfg;
        _env = env;
    }

    private bool IsAuthorized()
    {
        var expected = _cfg["Admin:Key"];
        var got = Request.Headers["X-Admin-Key"].ToString();

        // POC/dev ergonomics: if no admin key is configured, allow internal calls in Development.
        if (string.IsNullOrWhiteSpace(expected))
        {
            return _env.IsDevelopment();
        }

        return got == expected;
    }

    [HttpPut("{jobId}/status")]
    public async Task<IActionResult> PutStatus(string jobId, [FromBody] StatusUpdateRequest req)
    {
        if (!IsAuthorized()) return Unauthorized();

        var status = (req.status ?? "RUNNING").Trim().ToUpperInvariant();
        await _jobs.UpdateStatusAsync(jobId, status, req.progress, req.level ?? "info", req.message ?? "");
        return Ok(new { ok = true });
    }

    [HttpPut("{jobId}/result")]
    public async Task<IActionResult> PutResult(string jobId, [FromBody] ResultStoreRequest req)
    {
        if (!IsAuthorized()) return Unauthorized();

        await _jobs.StoreResultAsync(jobId, req.resultJson, req.reportMarkdown);
        return Ok(new { ok = true });
    }
}
