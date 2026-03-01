using FactHarbor.Api.Data;
using FactHarbor.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FactHarbor.Api.Controllers;

public sealed record CreateInviteCodeRequest(
    string code,
    string? description = null,
    int maxJobs = 5,
    int dailyLimit = 2,
    DateTime? expiresUtc = null
);

[ApiController]
[Route("v1/admin/invites")]
public sealed class AdminInviteCodesController : ControllerBase
{
    private readonly JobService _jobs;
    private readonly IConfiguration _cfg;

    public AdminInviteCodesController(JobService jobs, IConfiguration cfg)
    {
        _jobs = jobs;
        _cfg = cfg;
    }

    private bool IsAuthorized()
    {
        var expected = _cfg["Admin:Key"];
        var got = Request.Headers["X-Admin-Key"].ToString();
        return !string.IsNullOrWhiteSpace(expected) && got == expected;
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        if (!IsAuthorized()) return Unauthorized();
        var list = await _jobs.ListInviteCodesAsync();
        return Ok(list);
    }

    [HttpGet("{code}")]
    public async Task<IActionResult> Get(string code)
    {
        if (!IsAuthorized()) return Unauthorized();
        var invite = await _jobs.GetInviteCodeAsync(code);
        if (invite == null) return NotFound();
        return Ok(invite);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateInviteCodeRequest req)
    {
        if (!IsAuthorized()) return Unauthorized();
        
        if (string.IsNullOrWhiteSpace(req.code))
            return BadRequest(new { error = "Code is required" });

        var existing = await _jobs.GetInviteCodeAsync(req.code);
        if (existing != null)
            return Conflict(new { error = "Invite code already exists" });

        var invite = new InviteCodeEntity
        {
            Code = req.code,
            Description = req.description,
            MaxJobs = req.maxJobs,
            DailyLimit = req.dailyLimit,
            ExpiresUtc = req.expiresUtc,
            IsActive = true,
            CreatedUtc = DateTime.UtcNow
        };

        await _jobs.CreateInviteCodeAsync(invite);
        return Ok(invite);
    }

    [HttpDelete("{code}")]
    public async Task<IActionResult> Deactivate(string code)
    {
        if (!IsAuthorized()) return Unauthorized();
        var deactivated = await _jobs.DeactivateInviteCodeAsync(code);
        if (!deactivated) return NotFound();
        return Ok(new { ok = true, message = "Code deactivated" });
    }

    [HttpDelete("{code}/hard")]
    public async Task<IActionResult> Delete(string code)
    {
        if (!IsAuthorized()) return Unauthorized();
        var deleted = await _jobs.DeleteInviteCodeAsync(code);
        if (!deleted) return NotFound();
        return Ok(new { ok = true, message = "Code deleted" });
    }
}
