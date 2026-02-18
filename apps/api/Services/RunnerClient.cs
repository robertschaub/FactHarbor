using System.Text;
using System.Text.Json;
using FactHarbor.Api.Data;
using Microsoft.Extensions.Logging;
using System.IO;

namespace FactHarbor.Api.Services;

/// <summary>
/// Client for triggering the runner with resilient retry logic.
/// Implements exponential backoff with jitter for transient failures.
/// </summary>
public sealed class RunnerClient
{
    private readonly IConfiguration _cfg;
    private readonly HttpClient _http;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<RunnerClient> _log;

    // Retry configuration (loaded from appsettings)
    private readonly int _maxRetries;
    private readonly int _initialRetryDelayMs;
    private readonly int _maxRetryDelayMs;

    public RunnerClient(HttpClient http, IConfiguration cfg, IWebHostEnvironment env, ILogger<RunnerClient> log)
    {
        _http = http;
        _cfg = cfg;
        _env = env;
        _log = log;

        // Load retry settings with defaults
        _maxRetries = cfg.GetValue("Runner:MaxRetries", 3);
        _initialRetryDelayMs = cfg.GetValue("Runner:InitialRetryDelayMs", 1000);
        _maxRetryDelayMs = cfg.GetValue("Runner:MaxRetryDelayMs", 30000);
    }

    /// <summary>
    /// Requests the runner to abort a running job.
    /// Best-effort call (no retries) - job status is already CANCELLED in DB.
    /// </summary>
    public async Task<bool> AbortJobAsync(string jobId)
    {
        var baseUrl = _cfg["Runner:BaseUrl"]?.TrimEnd('/');
        var runnerKey = _cfg["Runner:RunnerKey"];

        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            _log.LogWarning("Runner:BaseUrl not set, cannot abort job {JobId}", jobId);
            return false;
        }

        var url = $"{baseUrl}/api/internal/abort-job/{jobId}";

        using var req = new HttpRequestMessage(HttpMethod.Post, url);
        if (!string.IsNullOrWhiteSpace(runnerKey))
        {
            req.Headers.Add("X-Runner-Key", runnerKey);
        }

        try
        {
            using var res = await _http.SendAsync(req);
            if (res.IsSuccessStatusCode)
            {
                _log.LogInformation("Successfully requested abort for job {JobId}", jobId);
                return true;
            }

            _log.LogWarning("Abort request failed for job {JobId}: {StatusCode}", jobId, res.StatusCode);
            return false;
        }
        catch (HttpRequestException ex)
        {
            _log.LogWarning(ex, "Failed to abort job {JobId} on runner (runner may not be running)", jobId);
            return false; // Runner may not be running, that's okay
        }
    }

    /// <summary>
    /// Triggers the runner with automatic retry on transient failures.
    /// Uses exponential backoff with jitter.
    /// </summary>
    public async Task TriggerRunnerAsync(string jobId, CancellationToken ct = default)
    {
        var baseUrl = _cfg["Runner:BaseUrl"]?.TrimEnd('/');
        var runnerKey = _cfg["Runner:RunnerKey"];

        if (string.IsNullOrWhiteSpace(baseUrl)) throw new InvalidOperationException("Runner:BaseUrl not set");
        if (string.IsNullOrWhiteSpace(runnerKey) && !_env.IsDevelopment())
        {
            throw new InvalidOperationException("Runner:RunnerKey not set");
        }

        var url = $"{baseUrl}/api/internal/run-job";
        Exception? lastException = null;

        for (var attempt = 1; attempt <= _maxRetries; attempt++)
        {
            try
            {
                await TriggerRunnerAttemptAsync(jobId, url, runnerKey, ct);

                if (attempt > 1)
                {
                    _log.LogInformation("Runner trigger succeeded on attempt {Attempt} for JobId={JobId}", attempt, jobId);
                }

                return; // Success
            }
            catch (Exception ex) when (IsTransientError(ex) && attempt < _maxRetries)
            {
                lastException = ex;
                var delay = CalculateRetryDelay(attempt);

                _log.LogWarning(
                    ex,
                    "Runner trigger failed (attempt {Attempt}/{MaxRetries}), retrying in {DelayMs}ms. JobId={JobId}",
                    attempt, _maxRetries, delay, jobId
                );

                await Task.Delay(delay, ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                _log.LogWarning("Runner trigger cancelled for JobId={JobId}", jobId);
                throw;
            }
            catch (Exception ex)
            {
                // Non-transient error or final attempt
                lastException = ex;
                _log.LogError(ex, "Runner trigger failed (attempt {Attempt}/{MaxRetries}). JobId={JobId}", attempt, _maxRetries, jobId);

                if (attempt == _maxRetries)
                {
                    throw new RunnerTriggerException(
                        $"Runner trigger failed after {_maxRetries} attempts: {ex.Message}",
                        ex,
                        jobId,
                        attempt
                    );
                }
            }
        }

        // Should not reach here, but handle just in case
        throw lastException ?? new InvalidOperationException("Runner trigger failed with unknown error");
    }

    private async Task TriggerRunnerAttemptAsync(string jobId, string url, string? runnerKey, CancellationToken ct)
    {
        var payload = JsonSerializer.Serialize(new { jobId });
        using var req = new HttpRequestMessage(HttpMethod.Post, url);

        if (!string.IsNullOrWhiteSpace(runnerKey))
        {
            req.Headers.Add("X-Runner-Key", runnerKey);
        }
        req.Content = new StringContent(payload, Encoding.UTF8, "application/json");

        using var res = await _http.SendAsync(req, ct);

        if (!res.IsSuccessStatusCode)
        {
            var txt = await res.Content.ReadAsStringAsync(ct);
            var statusCode = (int)res.StatusCode;

            // Throw specific exception types for better retry logic
            if (statusCode >= 500 || statusCode == 408 || statusCode == 429)
            {
                throw new HttpRequestException($"Runner returned {res.StatusCode}: {txt}", null, res.StatusCode);
            }

            throw new InvalidOperationException($"Runner call failed {res.StatusCode}: {txt}");
        }
    }

    /// <summary>
    /// Determines if an exception is transient and should be retried.
    /// </summary>
    private static bool IsTransientError(Exception ex)
    {
        // HttpRequestException with server errors (5xx) or timeout (408) or rate limit (429)
        if (ex is HttpRequestException httpEx && httpEx.StatusCode.HasValue)
        {
            var code = (int)httpEx.StatusCode.Value;
            return code >= 500 || code == 408 || code == 429;
        }

        // Network-level failures
        if (ex is HttpRequestException)
        {
            return true; // Connection refused, DNS failure, etc.
        }

        // Task cancelled due to timeout (not explicit cancellation)
        if (ex is TaskCanceledException tce && tce.CancellationToken == default)
        {
            return true;
        }

        return false;
    }

    /// <summary>
    /// Calculates retry delay using exponential backoff with jitter.
    /// </summary>
    private int CalculateRetryDelay(int attempt)
    {
        // Exponential backoff: initialDelay * 2^(attempt-1)
        var exponentialDelay = _initialRetryDelayMs * Math.Pow(2, attempt - 1);

        // Add jitter (±25%) to prevent thundering herd
        var jitter = (Random.Shared.NextDouble() - 0.5) * 0.5 * exponentialDelay;
        var delay = exponentialDelay + jitter;

        // Clamp to max delay
        return (int)Math.Min(delay, _maxRetryDelayMs);
    }
}

/// <summary>
/// Exception thrown when runner trigger fails after all retries.
/// </summary>
public sealed class RunnerTriggerException : Exception
{
    public string JobId { get; }
    public int Attempts { get; }

    public RunnerTriggerException(string message, Exception innerException, string jobId, int attempts)
        : base(message, innerException)
    {
        JobId = jobId;
        Attempts = attempts;
    }
}
