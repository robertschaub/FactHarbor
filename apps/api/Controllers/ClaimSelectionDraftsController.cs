using FactHarbor.Api.Data;
using FactHarbor.Api.Helpers;
using FactHarbor.Api.Services;
using Microsoft.AspNetCore.Http;
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
public sealed record UpdateSelectionStateRequest(string[] selectedClaimIds, DateTimeOffset? interactionUtc = null);
public sealed record RestartDraftRequest(string inputType, string inputValue);

[ApiController]
[Route("v1/claim-selection-drafts")]
public sealed class ClaimSelectionDraftsController : ControllerBase
{
    private const int AdminDraftDefaultPage = 1;
    private const int AdminDraftDefaultPageSize = 25;
    private const int AdminDraftMaxPageSize = 100;
    private const int AdminDraftMaxSearchLength = 120;

    private static readonly Dictionary<string, string> AdminDraftScopes = new(StringComparer.OrdinalIgnoreCase)
    {
        ["active"] = "active",
        ["terminal"] = "terminal",
        ["all"] = "all",
    };

    private static readonly Dictionary<string, string> AdminDraftHiddenFilters = new(StringComparer.OrdinalIgnoreCase)
    {
        ["include"] = "include",
        ["exclude"] = "exclude",
        ["only"] = "only",
    };

    private static readonly Dictionary<string, string> AdminDraftLinkedFilters = new(StringComparer.OrdinalIgnoreCase)
    {
        ["any"] = "any",
        ["withFinalJob"] = "withFinalJob",
        ["withoutFinalJob"] = "withoutFinalJob",
    };

    private static readonly Dictionary<string, string> AdminDraftSelectionModes = new(StringComparer.OrdinalIgnoreCase)
    {
        ["interactive"] = "interactive",
        ["automatic"] = "automatic",
    };

    private static readonly HashSet<string> AdminDraftStatuses = new(StringComparer.Ordinal)
    {
        "QUEUED",
        "PREPARING",
        "AWAITING_CLAIM_SELECTION",
        "FAILED",
        "COMPLETED",
        "CANCELLED",
        "EXPIRED",
    };

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
            isAdmin,
            ResolveSourceIp(Request));

        if (result is null)
            return StatusCode(statusCode, new { error });

        _ = TriggerDraftPreparationBestEffortAsync(result.DraftId);

        return Ok(new
        {
            draftId = result.DraftId,
            draftAccessToken = result.DraftAccessToken,
            status = result.Status,
            createdUtc = result.CreatedUtc,
            expiresUtc = result.ExpiresUtc,
        });
    }

    [HttpGet]
    [EnableRateLimiting("ReadPerIp")]
    public async Task<IActionResult> List()
    {
        if (!AuthHelper.IsAdminKeyValid(Request))
            return Unauthorized(new { error = "Admin key required" });

        var (query, validationError) = TryParseAdminDraftListQuery(Request.Query);
        if (query is null)
            return BadRequest(new { error = validationError });

        var result = await _drafts.ListDraftsForAdminAsync(query);
        return Ok(new
        {
            items = result.Items.Select(item => new
            {
                draftId = item.DraftId,
                status = item.Status,
                progress = item.Progress,
                isHidden = item.IsHidden,
                selectionMode = item.SelectionMode,
                activeInputType = item.ActiveInputType,
                inputPreview = item.InputPreview,
                finalJobId = item.FinalJobId,
                createdUtc = item.CreatedUtc.ToString("o"),
                updatedUtc = item.UpdatedUtc.ToString("o"),
                expiresUtc = item.ExpiresUtc.ToString("o"),
                restartCount = item.RestartCount,
                restartedViaOther = item.RestartedViaOther,
                hasPreparedStage1 = item.HasPreparedStage1,
                lastErrorCode = item.LastErrorCode,
                eventSummary = item.EventSummary,
            }),
            pagination = new
            {
                page = result.Page,
                pageSize = result.PageSize,
                totalCount = result.TotalCount,
                totalPages = result.TotalPages,
            },
            statusCounts = result.StatusCounts,
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
            isHidden = draft.IsHidden,
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

    [HttpGet("{draftId}/events")]
    [EnableRateLimiting("ReadPerIp")]
    public async Task<IActionResult> ListEvents(string draftId)
    {
        if (!AuthHelper.IsAdminKeyValid(Request))
            return Unauthorized(new { error = "Admin key required" });

        var draft = await _drafts.GetDraftAsync(draftId);
        if (draft is null)
            return NotFound(new { error = "Draft not found" });

        var events = await _drafts.ListDraftEventsForAdminAsync(draftId);
        return Ok(new
        {
            events = events.Select(item => new
            {
                id = item.Id,
                draftId = item.DraftId,
                tsUtc = item.TsUtc.ToString("o"),
                actorType = item.ActorType,
                action = item.Action,
                result = item.Result,
                beforeStatus = item.BeforeStatus,
                afterStatus = item.AfterStatus,
                sourceIp = item.SourceIp,
                message = item.Message,
            }),
        });
    }

    [HttpPost("{draftId}/confirm")]
    [EnableRateLimiting("AnalyzePerIp")]
    public async Task<IActionResult> Confirm(string draftId, [FromBody] ConfirmDraftRequest req)
    {
        var (authorizedDraft, authError) = await AuthorizeDraftAccessAsync(draftId);
        if (authError is not null) return authError;
        var actorType = ResolveDraftActorType(Request);
        var sourceIp = ResolveSourceIp(Request);
        var beforeStatus = authorizedDraft!.Status;

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
                }
                _drafts.RecordDraftEvent(
                    draft,
                    actorType,
                    "confirm",
                    "noop",
                    beforeStatus,
                    draft.Status,
                    sourceIp,
                    "Draft already has a final job");
                await _db.SaveChangesAsync();
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
            _drafts.RecordDraftEvent(draft, actorType, "confirm", "success", beforeStatus, draft.Status, sourceIp, $"JobId={job.JobId}");
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

    [HttpPost("{draftId}/selection-state")]
    [EnableRateLimiting("AnalyzePerIp")]
    public async Task<IActionResult> UpdateSelectionState(string draftId, [FromBody] UpdateSelectionStateRequest req)
    {
        var (_, authError) = await AuthorizeDraftAccessAsync(draftId);
        if (authError is not null) return authError;

        var interactionUtc = req.interactionUtc?.UtcDateTime ?? DateTime.UtcNow;
        var (draft, error, statusCode) = await _drafts.UpdateSelectionStateAsync(
            draftId,
            req.selectedClaimIds ?? Array.Empty<string>(),
            interactionUtc);
        if (draft is null)
            return StatusCode(statusCode, new { error });

        return Ok(new
        {
            draftId = draft.DraftId,
            status = draft.Status,
            finalJobId = draft.FinalJobId,
        });
    }

    [HttpPost("{draftId}/restart")]
    [EnableRateLimiting("AnalyzePerIp")]
    public async Task<IActionResult> Restart(string draftId, [FromBody] RestartDraftRequest req)
    {
        var (_, authError) = await AuthorizeDraftAccessAsync(draftId);
        if (authError is not null) return authError;

        var (draft, error, statusCode) = await _drafts.RestartWithOtherAsync(
            draftId,
            req.inputType,
            req.inputValue,
            ResolveDraftActorType(Request),
            ResolveSourceIp(Request));
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

        var (draft, error, statusCode) = await _drafts.CancelDraftAsync(
            draftId,
            ResolveDraftActorType(Request),
            ResolveSourceIp(Request));
        if (draft is null)
            return StatusCode(statusCode, new { error });

        return Ok(new { draftId = draft.DraftId, status = draft.Status });
    }

    [HttpPost("{draftId}/hide")]
    public async Task<IActionResult> HideDraft(string draftId)
    {
        if (!AuthHelper.IsAdminKeyValid(Request))
            return Unauthorized(new { error = "Admin key required" });

        var draft = await _drafts.SetHiddenAsync(draftId, true, "admin", ResolveSourceIp(Request));
        if (draft is null) return NotFound(new { error = "Draft not found" });
        return Ok(new { ok = true, isHidden = draft.IsHidden });
    }

    [HttpPost("{draftId}/unhide")]
    public async Task<IActionResult> UnhideDraft(string draftId)
    {
        if (!AuthHelper.IsAdminKeyValid(Request))
            return Unauthorized(new { error = "Admin key required" });

        var draft = await _drafts.SetHiddenAsync(draftId, false, "admin", ResolveSourceIp(Request));
        if (draft is null) return NotFound(new { error = "Draft not found" });
        return Ok(new { ok = true, isHidden = draft.IsHidden });
    }

    [HttpPost("{draftId}/retry")]
    [EnableRateLimiting("AnalyzePerIp")]
    public async Task<IActionResult> Retry(string draftId)
    {
        var (_, authError) = await AuthorizeDraftAccessAsync(draftId);
        if (authError is not null) return authError;

        var (draft, error, statusCode) = await _drafts.RetryDraftAsync(
            draftId,
            ResolveDraftActorType(Request),
            ResolveSourceIp(Request));
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

    private static string ResolveDraftActorType(HttpRequest request)
    {
        return AuthHelper.IsAdminKeyValid(request) ? "admin" : "draft_token";
    }

    private static string? ResolveSourceIp(HttpRequest request)
    {
        var forwardedFor = request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwardedFor))
            return forwardedFor.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();

        return request.HttpContext.Connection.RemoteIpAddress?.ToString();
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

    private static (AdminDraftListQuery? query, string? error) TryParseAdminDraftListQuery(IQueryCollection values)
    {
        var (scope, scopeError) = NormalizeAdminDraftEnum(
            values["scope"].FirstOrDefault(),
            AdminDraftScopes,
            "active",
            "scope");
        if (scopeError is not null) return (null, scopeError);

        var (hidden, hiddenError) = NormalizeAdminDraftEnum(
            values["hidden"].FirstOrDefault(),
            AdminDraftHiddenFilters,
            "include",
            "hidden");
        if (hiddenError is not null) return (null, hiddenError);

        var (linked, linkedError) = NormalizeAdminDraftEnum(
            values["linked"].FirstOrDefault(),
            AdminDraftLinkedFilters,
            "any",
            "linked");
        if (linkedError is not null) return (null, linkedError);

        var (selectionMode, selectionModeError) = NormalizeAdminDraftEnum(
            values["selectionMode"].FirstOrDefault(),
            AdminDraftSelectionModes,
            null,
            "selectionMode");
        if (selectionModeError is not null) return (null, selectionModeError);

        if (!TryParsePositiveInt(values["page"].FirstOrDefault(), AdminDraftDefaultPage, "page", out var page, out var pageError))
            return (null, pageError);
        if (!TryParsePositiveInt(values["pageSize"].FirstOrDefault(), AdminDraftDefaultPageSize, "pageSize", out var pageSize, out var pageSizeError))
            return (null, pageSizeError);

        pageSize = Math.Min(pageSize, AdminDraftMaxPageSize);

        var q = values["q"].FirstOrDefault()?.Trim();
        if (q?.Length > AdminDraftMaxSearchLength)
            return (null, $"q must be {AdminDraftMaxSearchLength} characters or fewer");
        if (q == "")
            q = null;

        var statuses = values["status"]
            .SelectMany(value => (value ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            .Select(value => value.ToUpperInvariant())
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        foreach (var status in statuses)
        {
            if (!AdminDraftStatuses.Contains(status))
                return (null, $"Unsupported status filter: {status}");
        }

        return (new AdminDraftListQuery(
            scope!,
            statuses,
            hidden!,
            linked!,
            selectionMode,
            q,
            page,
            pageSize), null);
    }

    private static (string? value, string? error) NormalizeAdminDraftEnum(
        string? rawValue,
        IReadOnlyDictionary<string, string> allowedValues,
        string? defaultValue,
        string parameterName)
    {
        if (string.IsNullOrWhiteSpace(rawValue))
            return (defaultValue, null);

        var trimmed = rawValue.Trim();
        if (allowedValues.TryGetValue(trimmed, out var normalized))
            return (normalized, null);

        return (null, $"Unsupported {parameterName} filter: {trimmed}");
    }

    private static bool TryParsePositiveInt(
        string? rawValue,
        int defaultValue,
        string parameterName,
        out int value,
        out string? error)
    {
        error = null;
        if (string.IsNullOrWhiteSpace(rawValue))
        {
            value = defaultValue;
            return true;
        }

        if (int.TryParse(rawValue, out value) && value >= 1)
            return true;

        error = $"{parameterName} must be a positive integer";
        return false;
    }
}
