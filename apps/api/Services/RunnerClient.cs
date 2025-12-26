using System.Text;
using System.Text.Json;
using FactHarbor.Api.Data;

namespace FactHarbor.Api.Services;

public sealed class RunnerClient
{
    private readonly IConfiguration _cfg;
    private readonly HttpClient _http = new HttpClient();

    public RunnerClient(IConfiguration cfg) { _cfg = cfg; }

    public async Task TriggerRunnerAsync(string jobId, CancellationToken ct = default)
    {
        var baseUrl = _cfg["Runner:BaseUrl"]?.TrimEnd('/');
        var runnerKey = _cfg["Runner:RunnerKey"];

        if (string.IsNullOrWhiteSpace(baseUrl)) throw new InvalidOperationException("Runner:BaseUrl not set");
        if (string.IsNullOrWhiteSpace(runnerKey)) throw new InvalidOperationException("Runner:RunnerKey not set");

        var url = $"{baseUrl}/api/internal/run-job";

        var payload = JsonSerializer.Serialize(new { jobId });
        using var req = new HttpRequestMessage(HttpMethod.Post, url);
        req.Headers.Add("X-Runner-Key", runnerKey);
        req.Content = new StringContent(payload, Encoding.UTF8, "application/json");

        var res = await _http.SendAsync(req, ct);
        if (!res.IsSuccessStatusCode)
        {
            var txt = await res.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException($"Runner call failed {res.StatusCode}: {txt}");
        }
    }
}
