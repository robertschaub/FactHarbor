using Microsoft.AspNetCore.Mvc;
using FactHarbor.Api.Services;

namespace FactHarbor.Api.Controllers;

/// <summary>
/// Proxies system health requests to the Next.js runner process.
/// The health state (circuit breaker, pause status) lives in the runner's globalThis,
/// so this controller forwards requests to the runner's /api/fh/system-health endpoint.
/// </summary>
[ApiController]
[Route("v1/system")]
public sealed class SystemHealthController : ControllerBase
{
    private readonly IConfiguration _cfg;
    private readonly HttpClient _http;
    private readonly ILogger<SystemHealthController> _log;

    public SystemHealthController(IConfiguration cfg, IHttpClientFactory httpFactory, ILogger<SystemHealthController> log)
    {
        _cfg = cfg;
        _http = httpFactory.CreateClient();
        _log = log;
    }

    private string GetRunnerBase()
    {
        var baseUrl = _cfg["Runner:BaseUrl"]?.TrimEnd('/');
        if (string.IsNullOrWhiteSpace(baseUrl))
            throw new InvalidOperationException("Runner:BaseUrl not configured");
        return baseUrl;
    }

    private bool IsAdminAuthorized()
    {
        var expected = _cfg["Admin:Key"];
        if (string.IsNullOrWhiteSpace(expected)) return false;
        var got = Request.Headers["X-Admin-Key"].ToString();
        return got == expected;
    }

    /// <summary>
    /// GET /v1/system/health — public endpoint returning current system health state.
    /// </summary>
    [HttpGet("health")]
    public async Task<IActionResult> GetHealth()
    {
        try
        {
            var runnerUrl = $"{GetRunnerBase()}/api/fh/system-health";
            var response = await _http.GetAsync(runnerUrl);
            var content = await response.Content.ReadAsStringAsync();
            return Content(content, "application/json");
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Failed to fetch system health from runner");
            return StatusCode(503, new { ok = false, error = "Runner unreachable", details = ex.Message });
        }
    }

    /// <summary>
    /// POST /v1/system/resume — admin-only: resume job processing after a provider outage.
    /// </summary>
    [HttpPost("resume")]
    public async Task<IActionResult> Resume()
    {
        if (!IsAdminAuthorized())
            return Unauthorized(new { ok = false, error = "Admin key required" });

        try
        {
            var runnerUrl = $"{GetRunnerBase()}/api/fh/system-health";
            var payload = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(new { action = "resume" }),
                System.Text.Encoding.UTF8,
                "application/json"
            );

            // Forward admin key to runner
            var adminKey = _cfg["Admin:Key"];
            if (!string.IsNullOrWhiteSpace(adminKey))
                payload.Headers.Add("X-Admin-Key", adminKey);

            using var request = new HttpRequestMessage(HttpMethod.Post, runnerUrl);
            request.Content = payload;
            if (!string.IsNullOrWhiteSpace(adminKey))
                request.Headers.Add("X-Admin-Key", adminKey);

            var response = await _http.SendAsync(request);
            var content = await response.Content.ReadAsStringAsync();
            return Content(content, "application/json");
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Failed to resume system via runner");
            return StatusCode(503, new { ok = false, error = "Runner unreachable", details = ex.Message });
        }
    }

    /// <summary>
    /// POST /v1/system/pause — admin-only: manually pause job processing.
    /// </summary>
    [HttpPost("pause")]
    public async Task<IActionResult> Pause([FromBody] PauseRequest? req)
    {
        if (!IsAdminAuthorized())
            return Unauthorized(new { ok = false, error = "Admin key required" });

        try
        {
            var runnerUrl = $"{GetRunnerBase()}/api/fh/system-health";
            var payload = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(new { action = "pause", reason = req?.Reason ?? "Manually paused by admin" }),
                System.Text.Encoding.UTF8,
                "application/json"
            );

            using var request = new HttpRequestMessage(HttpMethod.Post, runnerUrl);
            request.Content = payload;
            var adminKey = _cfg["Admin:Key"];
            if (!string.IsNullOrWhiteSpace(adminKey))
                request.Headers.Add("X-Admin-Key", adminKey);

            var response = await _http.SendAsync(request);
            var content = await response.Content.ReadAsStringAsync();
            return Content(content, "application/json");
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Failed to pause system via runner");
            return StatusCode(503, new { ok = false, error = "Runner unreachable", details = ex.Message });
        }
    }
}

public sealed record PauseRequest(string? Reason);
