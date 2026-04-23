using FactHarbor.Api.Data;
using FactHarbor.Api.Helpers;
using FactHarbor.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace FactHarbor.Api.Controllers;

public sealed record CreateDraftRequest(
    string inputType,
    string inputValue,
    string? selectionMode = "interactive",
    string? inviteCode = null);

public sealed record ConfirmDraftRequest(string[] selectedClaimIds);
public sealed record RestartDraftRequest(string inputType, string inputValue);

[ApiController]
[Route("v1/claim-selection-drafts")]
public sealed class ClaimSelectionDraftsController : ControllerBase
{
    private readonly ClaimSelectionDraftService _drafts;
    private readonly JobService _jobs;
    private readonly RunnerClient _runner;
    private readonly FhDbContext _db;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ClaimSelectionDraftsController> _log;

    public ClaimSelectionDraftsController(
        ClaimSelectionDraftService drafts,
        JobService jobs,
        RunnerClient runner,
        FhDbContext db,
        IServiceScopeFactory scopeFactory,
        ILogger<ClaimSelectionDraftsController> log)
    {
        _drafts = drafts;
        _jobs = jobs;
        _runner = runner;
        _db = db;
        _scopeFactory = scopeFactory;
        _log = log;
    }

    [HttpPost]
    [EnableRateLimiting("AnalyzePerIp")]
    [RequestSizeLimit(65_536)]
    public async Task<IActionResult> Create([FromBody] CreateDraftRequest req)
    {
        var isAdmin = AuthHelper.IsAdminKeyValid(Request);
        var (result, error, statusCode) = await _drafts.CreateDraftAsync(
            req.inputType,
            req.inputValue,
            req.selectionMode ?? "interactive",
            req.inviteCode,
            isAdmin);

        if (result is null)
            return StatusCode(statusCode, new { error });

        _ = TriggerDraftPreparationBestEffortAsync(result.DraftId);

        return Ok(new
        {
            draftId = result.DraftId,
            draftAccessToken = result.DraftAccessToken,
            status = result.Status,
        });
    }

    [HttpGet("{draftId}")]
    [EnableRateLimiting("ReadPerIp")]
    public async Task<IActionResult> Get(string draftId)
    {
        var (draft, authError) = await AuthorizeDraftAccessAsync(draftId);
        if (draft is null) return authError!;

        return Ok(new
        {
            draftId = draft.DraftId,
            status = draft.Status,
            progress = draft.Progress,
            lastEventMessage = draft.LastEventMessage,
            selectionMode = draft.SelectionMode,
            originalInputType = draft.OriginalInputType,
            originalInputValue = draft.OriginalInputValue,
            activeInputType = draft.ActiveInputType,
            activeInputValue = draft.ActiveInputValue,
            restartedViaOther = draft.RestartedViaOther,
            restartCount = draft.RestartCount,
            draftStateJson = draft.DraftStateJson,
            finalJobId = draft.FinalJobId,
            createdUtc = draft.CreatedUtc,
            updatedUtc = draft.UpdatedUtc,
            expiresUtc = draft.ExpiresUtc,
        });
    }

    [HttpPost("{draftId}/confirm")]
    [EnableRateLimiting("AnalyzePerIp")]
    public async Task<IActionResult> Confirm(string draftId, [FromBody] ConfirmDraftRequest req)
    {
        var (_, authError) = await AuthorizeDraftAccessAsync(draftId);
        if (authError is not null) return authError;

        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var (draft, error, statusCode) = await _drafts.ConfirmDraftAsync(draftId, req.selectedClaimIds);
            if (draft is null)
            {
                await tx.RollbackAsync();
                return StatusCode(statusCode, new { error });
            }

            if (draft.FinalJobId != null)
            {
                if (draft.Status != "COMPLETED")
                {
                    draft.Status = "COMPLETED";
                    draft.UpdatedUtc = DateTime.UtcNow;
                    await _db.SaveChangesAsync();
                }
                await tx.CommitAsync();
                return Ok(new { draftId = draft.DraftId, status = draft.Status, finalJobId = draft.FinalJobId });
            }

            var (job, jobError) = await _jobs.CreateJobFromDraftAsync(draft, req.selectedClaimIds);
            if (job is null)
            {
                await tx.RollbackAsync();
                return StatusCode(500, new { error = jobError ?? "Failed to create job from draft" });
            }

            var persistedSelectedClaimIds = TryExtractSelectedClaimIds(job.ClaimSelectionJson);
            if (persistedSelectedClaimIds.Length == 0)
            {
                await tx.RollbackAsync();
                return StatusCode(500, new { error = "Created draft-backed job is missing selected claim metadata" });
            }
            OverwriteDraftSelectedClaimIds(draft, persistedSelectedClaimIds);

            draft.FinalJobId = job.JobId;
            draft.Status = "COMPLETED";
            draft.UpdatedUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            _ = TriggerRunnerBestEffortAsync(job.JobId);

            return Ok(new { draftId = draft.DraftId, status = draft.Status, finalJobId = job.JobId });
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    [HttpPost("{draftId}/restart")]
    [EnableRateLimiting("AnalyzePerIp")]
    public async Task<IActionResult> Restart(string draftId, [FromBody] RestartDraftRequest req)
    {
        var (_, authError) = await AuthorizeDraftAccessAsync(draftId);
        if (authError is not null) return authError;

        var (draft, error, statusCode) = await _drafts.RestartWithOtherAsync(draftId, req.inputType, req.inputValue);
        if (draft is null)
            return StatusCode(statusCode, new { error });

        _ = TriggerDraftPreparationBestEffortAsync(draft.DraftId);

        return Ok(new { draftId = draft.DraftId, status = draft.Status, restartCount = draft.RestartCount });
    }

    [HttpPost("{draftId}/cancel")]
    public async Task<IActionResult> Cancel(string draftId)
    {
        var (_, authError) = await AuthorizeDraftAccessAsync(draftId);
        if (authError is not null) return authError;

        var (draft, error, statusCode) = await _drafts.CancelDraftAsync(draftId);
        if (draft is null)
            return StatusCode(statusCode, new { error });

        return Ok(new { draftId = draft.DraftId, status = draft.Status });
    }

    [HttpPost("{draftId}/retry")]
    [EnableRateLimiting("AnalyzePerIp")]
    public async Task<IActionResult> Retry(string draftId)
    {
        var (_, authError) = await AuthorizeDraftAccessAsync(draftId);
        if (authError is not null) return authError;

        var (draft, error, statusCode) = await _drafts.RetryDraftAsync(draftId);
        if (draft is null)
            return StatusCode(statusCode, new { error });

        _ = TriggerDraftPreparationBestEffortAsync(draft.DraftId);

        return Ok(new { draftId = draft.DraftId, status = draft.Status });
    }

    private async Task<(ClaimSelectionDraftEntity? draft, IActionResult? error)> AuthorizeDraftAccessAsync(string draftId)
    {
        var draft = await _drafts.GetDraftAsync(draftId);
        if (draft is null)
            return (null, NotFound(new { error = "Draft not found" }));

        if (AuthHelper.IsAdminKeyValid(Request))
            return (draft, null);

        var token = Request.Headers["X-Draft-Token"].FirstOrDefault();
        if (!_drafts.ValidateAccessToken(draft, token))
            return (null, Unauthorized(new { error = "Invalid draft access token" }));

        return (draft, null);
    }

    private async Task TriggerDraftPreparationBestEffortAsync(string draftId)
    {
        try
        {
            await _runner.TriggerDraftPreparationAsync(draftId);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Draft preparation trigger failed for DraftId={DraftId}", draftId);
            using var scope = _scopeFactory.CreateScope();
            var drafts = scope.ServiceProvider.GetRequiredService<ClaimSelectionDraftService>();
            try { await drafts.StoreFailureAsync(draftId, "stage1_failed", $"Runner trigger failed: {ex.Message}"); } catch { }
        }
    }

    private async Task TriggerRunnerBestEffortAsync(string jobId)
    {
        try
        {
            await _runner.TriggerRunnerAsync(jobId);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Runner trigger failed for confirmed draft job. JobId={JobId}", jobId);
            using var scope = _scopeFactory.CreateScope();
            var jobs = scope.ServiceProvider.GetRequiredService<JobService>();
            try { await jobs.UpdateStatusAsync(jobId, "FAILED", 100, "error", $"Runner trigger failed: {ex.Message}"); } catch { }
        }
    }

    private static string[] TryExtractSelectedClaimIds(string? claimSelectionJson)
    {
        if (string.IsNullOrWhiteSpace(claimSelectionJson))
            return Array.Empty<string>();

        try
        {
            using var doc = JsonDocument.Parse(claimSelectionJson);
            if (!doc.RootElement.TryGetProperty("selectedClaimIds", out var selectedClaimIds) ||
                selectedClaimIds.ValueKind != JsonValueKind.Array)
            {
                return Array.Empty<string>();
            }

            return selectedClaimIds
                .EnumerateArray()
                .Select(element => element.GetString())
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Cast<string>()
                .ToArray();
        }
        catch (JsonException)
        {
            return Array.Empty<string>();
        }
    }

    private static void OverwriteDraftSelectedClaimIds(ClaimSelectionDraftEntity draft, string[] selectedClaimIds)
    {
        var state = string.IsNullOrWhiteSpace(draft.DraftStateJson)
            ? new JsonObject()
            : JsonNode.Parse(draft.DraftStateJson)?.AsObject() ?? new JsonObject();

        state["selectedClaimIds"] = new JsonArray(selectedClaimIds.Select(id => JsonValue.Create(id)).ToArray());
        draft.DraftStateJson = state.ToJsonString();
    }
}
