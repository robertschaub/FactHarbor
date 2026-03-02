using FactHarbor.Api.Data;
using FactHarbor.Api.Helpers;
using FactHarbor.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FactHarbor.Api.Controllers;

public sealed record CreateInviteCodeRequest(
    string code,
    string? description = null,
    int maxJobs = 25,
    int hourlyLimit = 3,
    int dailyLimit = 6,
    DateTime? expiresUtc = null
);

[ApiController]
[Route("v1/admin/invites")]
public sealed class AdminInviteCodesController : ControllerBase
{
    private readonly JobService _jobs;

    public AdminInviteCodesController(JobService jobs)
    {
        _jobs = jobs;
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        if (!AuthHelper.IsAdminKeyValid(Request))
            return Unauthorized(new { error = "Admin key required" });
        var list = await _jobs.ListInviteCodesAsync();
        return Ok(list);
    }

    [HttpGet("{code}")]
    public async Task<IActionResult> Get(string code)
    {
        if (!AuthHelper.IsAdminKeyValid(Request))
            return Unauthorized(new { error = "Admin key required" });
        var invite = await _jobs.GetInviteCodeAsync(code);
        if (invite == null) return NotFound(new { error = "Invite code not found" });
        return Ok(invite);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateInviteCodeRequest req)
    {
        if (!AuthHelper.IsAdminKeyValid(Request))
            return Unauthorized(new { error = "Admin key required" });

        if (string.IsNullOrWhiteSpace(req.code))
            return BadRequest(new { error = "Code is required" });

        var normalizedCode = req.code.Trim();

        if (normalizedCode.Length > 64)
            return BadRequest(new { error = "Code must be 64 characters or fewer" });

        if (req.maxJobs < 1)
            return BadRequest(new { error = "MaxJobs must be at least 1" });

        if (req.hourlyLimit < 0)
            return BadRequest(new { error = "HourlyLimit must be greater than or equal to 0" });

        if (req.dailyLimit < 0)
            return BadRequest(new { error = "DailyLimit must be greater than or equal to 0" });

        DateTime? normalizedExpiresUtc = null;
        if (req.expiresUtc.HasValue)
        {
            normalizedExpiresUtc = req.expiresUtc.Value.Kind switch
            {
                DateTimeKind.Utc => req.expiresUtc.Value,
                DateTimeKind.Local => req.expiresUtc.Value.ToUniversalTime(),
                _ => DateTime.SpecifyKind(req.expiresUtc.Value, DateTimeKind.Utc)
            };

            if (normalizedExpiresUtc.Value <= DateTime.UtcNow)
                return BadRequest(new { error = "ExpiresUtc must be in the future" });
        }

        var existing = await _jobs.GetInviteCodeAsync(normalizedCode);
        if (existing != null)
            return Conflict(new { error = "Invite code already exists" });

        var invite = new InviteCodeEntity
        {
            Code = normalizedCode,
            Description = req.description,
            MaxJobs = req.maxJobs,
            HourlyLimit = req.hourlyLimit,
            DailyLimit = req.dailyLimit,
            ExpiresUtc = normalizedExpiresUtc,
            IsActive = true,
            CreatedUtc = DateTime.UtcNow
        };

        await _jobs.CreateInviteCodeAsync(invite);
        return Ok(invite);
    }

    [HttpDelete("{code}")]
    public async Task<IActionResult> Deactivate(string code)
    {
        if (!AuthHelper.IsAdminKeyValid(Request))
            return Unauthorized(new { error = "Admin key required" });
        var deactivated = await _jobs.DeactivateInviteCodeAsync(code);
        if (!deactivated) return NotFound(new { error = "Invite code not found" });
        return Ok(new { ok = true, message = "Code deactivated" });
    }

    [HttpDelete("{code}/hard")]
    public async Task<IActionResult> Delete(string code)
    {
        if (!AuthHelper.IsAdminKeyValid(Request))
            return Unauthorized(new { error = "Admin key required" });
        var deleted = await _jobs.DeleteInviteCodeAsync(code);
        if (!deleted) return NotFound(new { error = "Invite code not found" });
        return Ok(new { ok = true, message = "Code deleted" });
    }
}
