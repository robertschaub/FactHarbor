using System.Text;
using System.Text.Json;
using FactHarbor.Api.Data;

namespace FactHarbor.Api.Services;

public sealed class RunnerClient
{
    private readonly IConfiguration _cfg;
    private readonly HttpClient _http;
    private readonly IWebHostEnvironment _env;

    public RunnerClient(HttpClient http, IConfiguration cfg, IWebHostEnvironment env)
    {
        _http = http;
        _cfg = cfg;
        _env = env;
    }

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

        var payload = JsonSerializer.Serialize(new { jobId });
        using var req = new HttpRequestMessage(HttpMethod.Post, url);
        if (!string.IsNullOrWhiteSpace(runnerKey))
        {
            req.Headers.Add("X-Runner-Key", runnerKey);
        }
        req.Content = new StringContent(payload, Encoding.UTF8, "application/json");

        var res = await _http.SendAsync(req, ct);
        if (!res.IsSuccessStatusCode)
        {
            var txt = await res.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException($"Runner call failed {res.StatusCode}: {txt}");
        }
    }
}
