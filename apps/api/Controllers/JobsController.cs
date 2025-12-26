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

    public JobsController(JobService jobs, FhDbContext db)
    {
        _jobs = jobs;
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var items = await _jobs.ListJobsAsync();
        return Ok(items.Select(j => new
        {
            jobId = j.JobId,
            status = j.Status,
            createdUtc = j.CreatedUtc.ToString("o"),
            inputType = j.InputType,
            inputPreview = j.InputPreview
        }));
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
            resultJson = resultObj,
            reportMarkdown = j.ReportMarkdown
        });
    }

    [HttpGet("{jobId}/events")]
    public async Task EventsSse(string jobId, CancellationToken ct)
    {
        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");

        long lastId = 0;

        try
        {
            // Replay existing events
            var existing = await _db.JobEvents.Where(e => e.JobId == jobId).OrderBy(e => e.Id).ToListAsync(ct);
            foreach (var e in existing)
            {
                lastId = e.Id;
                await WriteEvent(e);
            }
            await Response.Body.FlushAsync(ct);

            // Poll for new events (POC)
            for (var i = 0; i < 300; i++) // ~10 minutes at 2s interval
            {
                await Task.Delay(2000, ct);
                var next = await _db.JobEvents
                    .Where(e => e.JobId == jobId && e.Id > lastId)
                    .OrderBy(e => e.Id)
                    .ToListAsync(ct);

                foreach (var e in next)
                {
                    lastId = e.Id;
                    await WriteEvent(e);
                }
                await Response.Body.FlushAsync(ct);
            }
        }
        catch (OperationCanceledException)
        {
            // Client disconnected or request aborted; stop polling.
        }

        async Task WriteEvent(JobEventEntity e)
        {
            var payload = JsonSerializer.Serialize(new { id = e.Id, tsUtc = e.TsUtc.ToString("o"), level = e.Level, message = e.Message });
            await Response.WriteAsync($"data: {payload}\n\n", ct);
        }
    }
}
