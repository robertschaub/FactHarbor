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

public sealed record UpdateInviteCodeRequest(
    string? description = null,
    int? maxJobs = null,
    int? hourlyLimit = null,
    int? dailyLimit = null,
    DateTime? expiresUtc = null,
    bool? isActive = null,
    bool clearExpiration = false
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

    [HttpPut("{code}")]
    public async Task<IActionResult> Update(string code, [FromBody] UpdateInviteCodeRequest req)
    {
        if (!AuthHelper.IsAdminKeyValid(Request))
            return Unauthorized(new { error = "Admin key required" });

        if (req.maxJobs.HasValue && req.maxJobs.Value < 1)
            return BadRequest(new { error = "MaxJobs must be at least 1" });
        if (req.hourlyLimit.HasValue && req.hourlyLimit.Value < 0)
            return BadRequest(new { error = "HourlyLimit must be >= 0" });
        if (req.dailyLimit.HasValue && req.dailyLimit.Value < 0)
            return BadRequest(new { error = "DailyLimit must be >= 0" });

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

        var updated = await _jobs.UpdateInviteCodeAsync(
            code, req.description, req.maxJobs, req.hourlyLimit, req.dailyLimit,
            normalizedExpiresUtc, req.isActive, req.clearExpiration);
        if (updated == null) return NotFound(new { error = "Invite code not found" });
        return Ok(updated);
    }

    [HttpGet("{code}/usage")]
    public async Task<IActionResult> GetUsage(string code)
    {
        if (!AuthHelper.IsAdminKeyValid(Request))
            return Unauthorized(new { error = "Admin key required" });

        var status = await _jobs.GetInviteCodeStatusAsync(code);
        if (status == null) return NotFound(new { error = "Invite code not found" });

        var history = await _jobs.GetInviteCodeUsageHistoryAsync(code);

        return Ok(new
        {
            code = status.code,
            lifetime = new { used = status.lifetimeUsed, limit = status.lifetimeLimit, remaining = status.lifetimeRemaining },
            hourly = new { used = status.hourlyUsed, limit = status.hourlyLimit, remaining = status.hourlyRemaining },
            daily = new { used = status.dailyUsed, limit = status.dailyLimit, remaining = status.dailyRemaining },
            history
        });
    }
}
