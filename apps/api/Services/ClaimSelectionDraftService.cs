using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using FactHarbor.Api.Data;
using FactHarbor.Api.Helpers;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace FactHarbor.Api.Services;

public sealed record AdminDraftListQuery(
    string Scope,
    IReadOnlyList<string> Statuses,
    string Hidden,
    string Linked,
    string? SelectionMode,
    string? Q,
    int Page,
    int PageSize);

public sealed record AdminDraftSummary(
    string DraftId,
    string Status,
    int Progress,
    bool IsHidden,
    string SelectionMode,
    string ActiveInputType,
    string? InputPreview,
    string? FinalJobId,
    DateTime CreatedUtc,
    DateTime UpdatedUtc,
    DateTime ExpiresUtc,
    int RestartCount,
    bool RestartedViaOther,
    bool HasPreparedStage1,
    string? LastErrorCode,
    string? EventSummary);

public sealed record AdminDraftListPage(
    IReadOnlyList<AdminDraftSummary> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages,
    IReadOnlyDictionary<string, int> StatusCounts);

public sealed record AdminDraftEvent(
    long Id,
    string DraftId,
    DateTime TsUtc,
    string ActorType,
    string Action,
    string Result,
    string? BeforeStatus,
    string? AfterStatus,
    string? SourceIp,
    string? Message);

public sealed class ClaimSelectionDraftService
{
    // Compatibility fallback for legacy drafts created before selectionCap was persisted.
    // Current drafts must carry their configured threshold in DraftStateJson.
    private const int LegacyDraftSelectionCap = 5;
    private const int AbsoluteClaimSelectionCap = 5;
    private const int DefaultMaxRestartsPerDraft = 1;
    private const int AbsoluteMaxRestartsPerDraft = 5;
    private const int MaxFailureHistoryEntries = 5;
    private const int AdminDraftInputPreviewMaxLength = 96;
    private const int AdminDraftEventSummaryMaxLength = 120;
    private const int DraftAuditSourceIpMaxLength = 128;
    private const int DraftAuditMessageMaxLength = 512;

    private static readonly string[] ActiveAdminDraftStatuses =
    [
        "QUEUED",
        "PREPARING",
        "AWAITING_CLAIM_SELECTION",
        "FAILED",
    ];

    private static readonly string[] TerminalAdminDraftStatuses =
    [
        "COMPLETED",
        "CANCELLED",
        "EXPIRED",
    ];

    private readonly FhDbContext _db;
    private readonly ILogger<ClaimSelectionDraftService> _log;
    private readonly int _maxRestartsPerDraft;

    public ClaimSelectionDraftService(
        FhDbContext db,
        ILogger<ClaimSelectionDraftService> log,
        IConfiguration configuration)
    {
        _db = db;
        _log = log;
        _maxRestartsPerDraft = ResolveMaxRestartsPerDraft(configuration);
    }

    public sealed record CreateDraftResult(
        string DraftId,
        string DraftAccessToken,
        string Status,
        DateTime CreatedUtc,
        DateTime ExpiresUtc);

    public sealed record IdleAutoProceedDueDraft(
        string DraftId,
        string DraftStateJson,
        string[] SelectedClaimIds);

    public async Task<(CreateDraftResult? result, string? error, int statusCode)> CreateDraftAsync(
        string inputType,
        string inputValue,
        string selectionMode,
        string? inviteCode,
        bool isAdmin,
        string? sourceIp = null)
    {
        var (valid, validationError) = AnalyzeInputValidator.Validate(inputType, inputValue);
        if (!valid) return (null, validationError, 400);

        if (selectionMode != "interactive" && selectionMode != "automatic")
            return (null, "selectionMode must be 'interactive' or 'automatic'", 400);

        if (!isAdmin)
        {
            var (claimed, slotError, contentionExhausted) = await TryClaimInviteSlotForDraftAsync(inviteCode);
            if (!claimed)
                return (null, slotError, contentionExhausted ? 503 : 400);
        }

        var accessToken = GenerateAccessToken();
        var tokenHash = HashToken(accessToken);

        var draft = new ClaimSelectionDraftEntity
        {
            DraftId = Guid.NewGuid().ToString("N"),
            Status = "QUEUED",
            OriginalInputType = inputType,
            ActiveInputType = inputType,
            OriginalInputValue = inputValue,
            ActiveInputValue = inputValue,
            PipelineVariant = "claimboundary",
            InviteCode = inviteCode,
            SelectionMode = selectionMode,
            DraftAccessTokenHash = tokenHash,
            CreatedUtc = DateTime.UtcNow,
            UpdatedUtc = DateTime.UtcNow,
            ExpiresUtc = DateTime.UtcNow.AddHours(24),
        };

        _db.ClaimSelectionDrafts.Add(draft);
        RecordDraftEvent(
            draft,
            isAdmin ? "admin" : "draft_token",
            "create",
            "success",
            null,
            draft.Status,
            sourceIp);
        await _db.SaveChangesAsync();

        return (new CreateDraftResult(draft.DraftId, accessToken, draft.Status, draft.CreatedUtc, draft.ExpiresUtc), null, 0);
    }

    public async Task<ClaimSelectionDraftEntity?> GetDraftAsync(string draftId)
    {
        var draft = await _db.ClaimSelectionDrafts.FindAsync(draftId);
        if (draft is null) return null;
        if (EnforceLazyExpiry(draft))
            await _db.SaveChangesAsync();
        return draft;
    }

    public async Task<List<ClaimSelectionDraftEntity>> ListRecoverableDraftsAsync()
    {
        var drafts = await _db.ClaimSelectionDrafts
            .Where(d =>
                d.FinalJobId == null &&
                (d.Status == "QUEUED" || d.Status == "PREPARING"))
            .OrderBy(d => d.CreatedUtc)
            .ToListAsync();

        var mutated = false;
        foreach (var draft in drafts)
        {
            if (EnforceLazyExpiry(draft))
                mutated = true;
        }

        if (mutated)
        {
            await _db.SaveChangesAsync();
            drafts = drafts
                .Where(d => d.Status == "QUEUED" || d.Status == "PREPARING")
                .ToList();
        }

        return drafts;
    }

    public async Task<List<IdleAutoProceedDueDraft>> ListIdleAutoProceedDueDraftsAsync()
    {
        var drafts = await _db.ClaimSelectionDrafts
            .Where(d =>
                d.FinalJobId == null &&
                d.Status == "AWAITING_CLAIM_SELECTION")
            .OrderBy(d => d.UpdatedUtc)
            .ToListAsync();

        var mutated = false;
        var dueDrafts = new List<IdleAutoProceedDueDraft>();
        var nowUtc = DateTime.UtcNow;

        foreach (var draft in drafts)
        {
            if (EnforceLazyExpiry(draft))
            {
                mutated = true;
                continue;
            }

            if (!TryExtractIdleAutoProceedState(
                    draft.DraftStateJson,
                    out var selectionIdleAutoProceedMs,
                    out var lastSelectionInteractionUtc,
                    out var selectedClaimIds,
                    out var candidateClaimIds,
                    out _))
            {
                continue;
            }

            if (selectionIdleAutoProceedMs <= 0 || selectedClaimIds.Length == 0)
                continue;
            if (lastSelectionInteractionUtc == DateTime.MinValue)
                continue;

            var effectiveSelectionCap = GetEffectiveSelectionCap(draft.DraftStateJson, candidateClaimIds.Count);
            if (!IsValidSelectedClaimSet(selectedClaimIds, candidateClaimIds, effectiveSelectionCap))
                continue;

            var dueUtc = lastSelectionInteractionUtc.AddMilliseconds(selectionIdleAutoProceedMs);
            if (dueUtc > nowUtc)
                continue;

            dueDrafts.Add(new IdleAutoProceedDueDraft(
                draft.DraftId,
                draft.DraftStateJson ?? "{}",
                selectedClaimIds));
        }

        if (mutated)
        {
            await _db.SaveChangesAsync();
        }

        return dueDrafts;
    }

    public async Task<AdminDraftListPage> ListDraftsForAdminAsync(AdminDraftListQuery query)
    {
        var expiredDrafts = await _db.ClaimSelectionDrafts
            .Where(d =>
                d.Status != "COMPLETED" &&
                d.Status != "CANCELLED" &&
                d.Status != "EXPIRED" &&
                d.ExpiresUtc < DateTime.UtcNow)
            .ToListAsync();

        var mutated = false;
        foreach (var draft in expiredDrafts)
        {
            if (EnforceLazyExpiry(draft))
                mutated = true;
        }

        if (mutated)
            await _db.SaveChangesAsync();

        var filtered = ApplyAdminDraftFilters(_db.ClaimSelectionDrafts.AsNoTracking(), query);
        var totalCount = await filtered.CountAsync();
        var statusCounts = await filtered
            .GroupBy(d => d.Status)
            .Select(group => new { Status = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.Status, item => item.Count);
        var totalPages = totalCount == 0
            ? 0
            : (int)Math.Ceiling(totalCount / (double)query.PageSize);

        var drafts = await filtered
            .OrderByDescending(d => d.UpdatedUtc)
            .ThenBy(d => d.DraftId)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();

        return new AdminDraftListPage(
            drafts.Select(BuildAdminDraftSummary).ToList(),
            query.Page,
            query.PageSize,
            totalCount,
            totalPages,
            statusCounts);
    }

    public async Task<IReadOnlyList<AdminDraftEvent>> ListDraftEventsForAdminAsync(string draftId, int limit = 100)
    {
        var clampedLimit = Math.Clamp(limit, 1, 200);
        return await _db.ClaimSelectionDraftEvents
            .AsNoTracking()
            .Where(e => e.DraftId == draftId)
            .OrderByDescending(e => e.Id)
            .Take(clampedLimit)
            .Select(e => new AdminDraftEvent(
                e.Id,
                e.DraftId,
                e.TsUtc,
                e.ActorType,
                e.Action,
                e.Result,
                e.BeforeStatus,
                e.AfterStatus,
                e.SourceIp,
                e.Message))
            .ToListAsync();
    }

    public async Task<(ClaimSelectionDraftEntity? draft, string? error, int statusCode)> UpdateSelectionStateAsync(
        string draftId,
        string[] selectedClaimIds,
        DateTime interactionUtc)
    {
        var draft = await _db.ClaimSelectionDrafts.FindAsync(draftId);
        if (draft is null) return (null, "Draft not found", 404);
        if (EnforceLazyExpiry(draft))
            await _db.SaveChangesAsync();

        if (draft.Status == "EXPIRED")
            return (null, "Draft has expired", 410);
        if (draft.FinalJobId != null || draft.Status == "COMPLETED")
            return (draft, null, 0);
        if (draft.Status != "AWAITING_CLAIM_SELECTION")
            return (null, $"Draft is in {draft.Status} state and cannot update selection state", 409);

        if (!TryExtractIdleAutoProceedState(
                draft.DraftStateJson,
                out _,
                out var currentLastSelectionInteractionUtc,
                out _,
                out var candidateClaimIds,
                out var extractionError))
        {
            return (null, extractionError ?? "Draft is missing prepared candidate claims", 409);
        }

        var normalizedInteractionUtc = DateTime.SpecifyKind(interactionUtc, DateTimeKind.Utc);
        if (currentLastSelectionInteractionUtc > normalizedInteractionUtc)
        {
            return (draft, null, 0);
        }

        var effectiveSelectionCap = GetEffectiveSelectionCap(draft.DraftStateJson, candidateClaimIds.Count);
        if (selectedClaimIds.Length > effectiveSelectionCap)
            return (null, BuildSelectionCapError(effectiveSelectionCap), 400);

        if (selectedClaimIds.Length != selectedClaimIds.Distinct().Count())
            return (null, "Duplicate claim IDs", 400);

        var invalid = selectedClaimIds.Where(id => !candidateClaimIds.Contains(id)).ToArray();
        if (invalid.Length > 0)
        {
            return (null, $"Selected claim IDs not in candidate set: {string.Join(", ", invalid)}", 400);
        }

        var state = ParseDraftStateNode(draft.DraftStateJson);
        state["lastSelectionInteractionUtc"] = normalizedInteractionUtc.ToString("o");
        if (selectedClaimIds.Length > 0)
        {
            state["selectedClaimIds"] = new JsonArray(selectedClaimIds.Select(id => JsonValue.Create(id)).ToArray());
        }

        draft.DraftStateJson = state.ToJsonString();
        draft.UpdatedUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return (draft, null, 0);
    }

    public async Task<(ClaimSelectionDraftEntity? draft, string? error, int statusCode)> ConfirmDraftAsync(
        string draftId,
        string[] selectedClaimIds)
    {
        var draft = await _db.ClaimSelectionDrafts.FindAsync(draftId);
        if (draft is null) return (null, "Draft not found", 404);
        if (EnforceLazyExpiry(draft))
            await _db.SaveChangesAsync();

        if (draft.Status == "EXPIRED")
            return (null, "Draft has expired", 410);
        if (draft.FinalJobId != null)
            return (draft, null, 0);
        if (draft.Status == "COMPLETED")
            return (null, "Draft already confirmed", 409);
        if (draft.Status != "AWAITING_CLAIM_SELECTION")
            return (null, $"Draft is in {draft.Status} state and cannot be confirmed", 409);

        if (!TryExtractPreparedCandidateClaimIds(draft.DraftStateJson, out var candidateClaimIds, out var extractionError))
            return (null, extractionError ?? "Draft is missing prepared candidate claims", 409);

        var effectiveSelectionCap = GetEffectiveSelectionCap(draft.DraftStateJson, candidateClaimIds.Count);
        if (selectedClaimIds.Length < 1 || selectedClaimIds.Length > effectiveSelectionCap)
            return (null, BuildSelectionCapError(effectiveSelectionCap), 400);

        if (selectedClaimIds.Length != selectedClaimIds.Distinct().Count())
            return (null, "Duplicate claim IDs", 400);

        var invalid = selectedClaimIds.Where(id => !candidateClaimIds.Contains(id)).ToArray();
        if (invalid.Length > 0)
        {
            return (null, $"Selected claim IDs not in candidate set: {string.Join(", ", invalid)}", 400);
        }

        if (!TryMergeDraftStateSelectedClaims(draft, selectedClaimIds))
            return (null, "Draft state could not be updated with selected claims", 409);

        draft.UpdatedUtc = DateTime.UtcNow;

        return (draft, null, 0);
    }

    public async Task<(ClaimSelectionDraftEntity? draft, string? error, int statusCode)> RestartWithOtherAsync(
        string draftId,
        string newInputType,
        string newInputValue,
        string actorType = "draft_token",
        string? sourceIp = null)
    {
        var (valid, validationError) = AnalyzeInputValidator.Validate(newInputType, newInputValue);
        if (!valid) return (null, validationError, 400);

        var draft = await _db.ClaimSelectionDrafts.FindAsync(draftId);
        if (draft is null) return (null, "Draft not found", 404);
        if (EnforceLazyExpiry(draft))
            await _db.SaveChangesAsync();

        if (draft.Status == "EXPIRED")
        {
            RecordDraftEvent(draft, actorType, "restart", "rejected", draft.Status, draft.Status, sourceIp, "Draft has expired");
            await _db.SaveChangesAsync();
            return (null, "Draft has expired", 410);
        }
        if (draft.Status == "COMPLETED")
        {
            RecordDraftEvent(draft, actorType, "restart", "rejected", draft.Status, draft.Status, sourceIp, "Draft already confirmed");
            await _db.SaveChangesAsync();
            return (null, "Draft already confirmed", 409);
        }
        if (draft.Status == "CANCELLED")
        {
            RecordDraftEvent(draft, actorType, "restart", "rejected", draft.Status, draft.Status, sourceIp, "Draft has been cancelled");
            await _db.SaveChangesAsync();
            return (null, "Draft has been cancelled", 409);
        }
        if (draft.Status == "PREPARING")
        {
            const string preparingMessage = "Draft is currently being prepared; wait for it to finish or cancel it first";
            RecordDraftEvent(draft, actorType, "restart", "rejected", draft.Status, draft.Status, sourceIp, preparingMessage);
            await _db.SaveChangesAsync();
            return (null, "Draft is currently being prepared — wait for it to finish or cancel it first", 409);
        }
        if (draft.RestartCount >= _maxRestartsPerDraft)
        {
            var message = BuildRestartLimitError(_maxRestartsPerDraft);
            RecordDraftEvent(draft, actorType, "restart", "rejected", draft.Status, draft.Status, sourceIp, message);
            await _db.SaveChangesAsync();
            return (null, BuildRestartLimitError(_maxRestartsPerDraft), 429);
        }

        var beforeStatus = draft.Status;
        draft.ActiveInputType = newInputType;
        draft.ActiveInputValue = newInputValue;
        draft.RestartedViaOther = true;
        draft.RestartCount++;
        draft.Status = "QUEUED";
        draft.Progress = 0;
        draft.DraftStateJson = null;
        draft.LastEventMessage = null;
        draft.UpdatedUtc = DateTime.UtcNow;

        RecordDraftEvent(draft, actorType, "restart", "success", beforeStatus, draft.Status, sourceIp);
        await _db.SaveChangesAsync();
        return (draft, null, 0);
    }

    public async Task<(ClaimSelectionDraftEntity? draft, string? error, int statusCode)> CancelDraftAsync(
        string draftId,
        string actorType = "draft_token",
        string? sourceIp = null)
    {
        var draft = await _db.ClaimSelectionDrafts.FindAsync(draftId);
        if (draft is null) return (null, "Draft not found", 404);
        if (draft.FinalJobId != null)
        {
            RecordDraftEvent(draft, actorType, "cancel", "noop", draft.Status, draft.Status, sourceIp, "Draft already has a final job");
            await _db.SaveChangesAsync();
            return (draft, null, 0);
        }

        if (EnforceLazyExpiry(draft))
            await _db.SaveChangesAsync();

        if (draft.Status is "COMPLETED" or "CANCELLED" or "EXPIRED")
        {
            RecordDraftEvent(draft, actorType, "cancel", "noop", draft.Status, draft.Status, sourceIp);
            await _db.SaveChangesAsync();
            return (draft, null, 0);
        }
        if (draft.Status == "PREPARING")
        {
            RecordDraftEvent(
                draft,
                actorType,
                "cancel",
                "rejected",
                draft.Status,
                draft.Status,
                sourceIp,
                "Draft preparation is in progress and cannot be cancelled");
            await _db.SaveChangesAsync();
            return (null, "Draft preparation is in progress and cannot be cancelled", 409);
        }

        var beforeStatus = draft.Status;
        draft.Status = "CANCELLED";
        draft.LastEventMessage = "Draft cancelled.";
        draft.UpdatedUtc = DateTime.UtcNow;
        RecordDraftEvent(draft, actorType, "cancel", "success", beforeStatus, draft.Status, sourceIp);
        await _db.SaveChangesAsync();
        return (draft, null, 0);
    }

    public async Task<(ClaimSelectionDraftEntity? draft, string? error, int statusCode)> RetryDraftAsync(
        string draftId,
        string actorType = "draft_token",
        string? sourceIp = null)
    {
        var draft = await _db.ClaimSelectionDrafts.FindAsync(draftId);
        if (draft is null) return (null, "Draft not found", 404);
        if (EnforceLazyExpiry(draft))
            await _db.SaveChangesAsync();

        if (draft.Status == "EXPIRED")
        {
            RecordDraftEvent(draft, actorType, "retry", "rejected", draft.Status, draft.Status, sourceIp, "Draft has expired");
            await _db.SaveChangesAsync();
            return (null, "Draft has expired", 410);
        }
        if (draft.Status != "FAILED")
        {
            var message = $"Only FAILED drafts can be retried, current status: {draft.Status}";
            RecordDraftEvent(draft, actorType, "retry", "rejected", draft.Status, draft.Status, sourceIp, message);
            await _db.SaveChangesAsync();
            return (null, $"Only FAILED drafts can be retried, current status: {draft.Status}", 409);
        }

        var beforeStatus = draft.Status;
        draft.Status = "QUEUED";
        draft.Progress = 0;
        draft.LastEventMessage = null;
        draft.UpdatedUtc = DateTime.UtcNow;
        RecordDraftEvent(draft, actorType, "retry", "success", beforeStatus, draft.Status, sourceIp);
        await _db.SaveChangesAsync();
        return (draft, null, 0);
    }

    public async Task<ClaimSelectionDraftEntity?> SetHiddenAsync(
        string draftId,
        bool hidden,
        string actorType = "admin",
        string? sourceIp = null)
    {
        var draft = await _db.ClaimSelectionDrafts.FindAsync(draftId);
        if (draft is null) return null;
        if (EnforceLazyExpiry(draft))
            await _db.SaveChangesAsync();

        if (draft.IsHidden == hidden)
        {
            RecordDraftEvent(draft, actorType, hidden ? "hide" : "unhide", "noop", draft.Status, draft.Status, sourceIp);
            await _db.SaveChangesAsync();
            return draft;
        }

        draft.IsHidden = hidden;
        draft.UpdatedUtc = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(draft.FinalJobId))
        {
            var job = await _db.Jobs.FindAsync(draft.FinalJobId);
            if (job is not null)
            {
                job.IsHidden = hidden;
                job.UpdatedUtc = DateTime.UtcNow;
            }
        }

        RecordDraftEvent(draft, actorType, hidden ? "hide" : "unhide", "success", draft.Status, draft.Status, sourceIp);
        await _db.SaveChangesAsync();
        return draft;
    }

    public async Task UpdateStatusAsync(string draftId, string status, int? progress, string? eventMessage)
    {
        var draft = await _db.ClaimSelectionDrafts.FindAsync(draftId);
        if (draft is null) return;
        if (EnforceLazyExpiry(draft))
        {
            await _db.SaveChangesAsync();
            return;
        }
        if (IsTerminalDraftState(draft))
            return;
        if (draft.Status is "FAILED" or "AWAITING_CLAIM_SELECTION")
            return;

        var beforeStatus = draft.Status;
        draft.Status = status;
        if (progress.HasValue) draft.Progress = progress.Value;
        if (!string.IsNullOrWhiteSpace(eventMessage)) draft.LastEventMessage = eventMessage;
        draft.UpdatedUtc = DateTime.UtcNow;
        if (!string.Equals(beforeStatus, draft.Status, StringComparison.Ordinal))
            RecordDraftEvent(draft, "runner", "status", "success", beforeStatus, draft.Status, null, eventMessage);
        await _db.SaveChangesAsync();
    }

    public async Task StorePreparedResultAsync(string draftId, string draftStateJson)
    {
        var draft = await _db.ClaimSelectionDrafts.FindAsync(draftId);
        if (draft is null) return;
        if (EnforceLazyExpiry(draft))
        {
            await _db.SaveChangesAsync();
            return;
        }
        if (IsTerminalDraftState(draft) || draft.Status is "FAILED" or "AWAITING_CLAIM_SELECTION")
            return;

        var mergedDraftStateJson = MergePriorFailureDiagnostics(draft.DraftStateJson, draftStateJson);
        var beforeStatus = draft.Status;
        draft.DraftStateJson = mergedDraftStateJson;
        draft.Status = "AWAITING_CLAIM_SELECTION";
        draft.Progress = 100;
        draft.LastEventMessage =
            TryExtractObservabilityEventMessage(mergedDraftStateJson)
            ?? "Prepared claim set awaiting selection.";
        draft.UpdatedUtc = DateTime.UtcNow;
        RecordDraftEvent(draft, "runner", "prepare", "success", beforeStatus, draft.Status, null, draft.LastEventMessage);
        await _db.SaveChangesAsync();
    }

    public async Task<(ClaimSelectionDraftEntity? draft, string? error, int statusCode)> PrepareAutoContinueAsync(
        string draftId,
        string draftStateJson,
        string[] selectedClaimIds)
    {
        var draft = await _db.ClaimSelectionDrafts.FindAsync(draftId);
        if (draft is null) return (null, "Draft not found", 404);
        if (EnforceLazyExpiry(draft))
            await _db.SaveChangesAsync();

        if (draft.Status == "EXPIRED")
            return (null, "Draft has expired", 410);
        if (draft.FinalJobId != null)
            return (draft, null, 0);
        if (draft.Status == "COMPLETED")
            return (null, "Draft already confirmed", 409);
        if (draft.Status is not "QUEUED" and not "PREPARING" and not "AWAITING_CLAIM_SELECTION")
            return (null, $"Draft is in {draft.Status} state and cannot auto-continue", 409);

        var mergeSourceDraftStateJson = draftStateJson;
        if (draft.Status == "AWAITING_CLAIM_SELECTION")
        {
            if (!TryExtractIdleAutoProceedState(
                    draftStateJson,
                    out _,
                    out var expectedLastSelectionInteractionUtc,
                    out _,
                    out _,
                    out var expectedStateError))
            {
                return (null, expectedStateError ?? "Draft auto-confirm request is missing idle selection state", 409);
            }

            if (expectedLastSelectionInteractionUtc == DateTime.MinValue)
                return (null, "Draft auto-confirm request is missing the last selection interaction timestamp", 409);

            if (!TryExtractIdleAutoProceedState(
                    draft.DraftStateJson,
                    out _,
                    out var currentLastSelectionInteractionUtc,
                    out _,
                    out _,
                    out var currentStateError))
            {
                return (null, currentStateError ?? "Draft is missing prepared candidate claims", 409);
            }

            if (currentLastSelectionInteractionUtc == DateTime.MinValue)
                return (null, "Draft inactivity auto-continue has not been armed yet", 409);

            if (currentLastSelectionInteractionUtc != expectedLastSelectionInteractionUtc)
                return (null, "Draft selection state changed before automatic continuation could run", 409);

            mergeSourceDraftStateJson = draft.DraftStateJson ?? draftStateJson;
        }

        if (!TryExtractPreparedCandidateClaimIds(mergeSourceDraftStateJson, out var candidateClaimIds, out var extractionError))
            return (null, extractionError ?? "Draft is missing prepared candidate claims", 409);

        var effectiveSelectionCap = GetEffectiveSelectionCap(mergeSourceDraftStateJson, candidateClaimIds.Count);
        if (selectedClaimIds.Length < 1 || selectedClaimIds.Length > effectiveSelectionCap)
            return (null, BuildSelectionCapError(effectiveSelectionCap), 400);

        if (selectedClaimIds.Length != selectedClaimIds.Distinct().Count())
            return (null, "Duplicate claim IDs", 400);

        var invalid = selectedClaimIds.Where(id => !candidateClaimIds.Contains(id)).ToArray();
        if (invalid.Length > 0)
        {
            return (null, $"Selected claim IDs not in candidate set: {string.Join(", ", invalid)}", 400);
        }

        if (!TryMergeDraftStateSelectedClaims(mergeSourceDraftStateJson, selectedClaimIds, out var mergedDraftStateJson))
            return (null, "Draft state could not be updated with selected claims", 409);

        var mergedWithFailureHistory = MergePriorFailureDiagnostics(draft.DraftStateJson, mergedDraftStateJson);
        draft.DraftStateJson = mergedWithFailureHistory;
        draft.Progress = 100;
        draft.LastEventMessage =
            TryExtractObservabilityEventMessage(mergedWithFailureHistory)
            ?? "Prepared claim set handed off for automatic continuation.";
        draft.UpdatedUtc = DateTime.UtcNow;

        return (draft, null, 0);
    }

    public async Task StoreFailureAsync(string draftId, string errorCode, string errorMessage, string? draftStateJson = null)
    {
        var draft = await _db.ClaimSelectionDrafts.FindAsync(draftId);
        if (draft is null) return;
        if (EnforceLazyExpiry(draft))
        {
            await _db.SaveChangesAsync();
            return;
        }
        if (IsTerminalDraftState(draft) || draft.Status is "FAILED" or "AWAITING_CLAIM_SELECTION")
            return;

        var beforeStatus = draft.Status;
        var failedUtc = DateTime.UtcNow;
        draft.Status = "FAILED";
        draft.LastEventMessage = errorMessage;
        draft.UpdatedUtc = failedUtc;

        var stateNode = ParseDraftStateNode(string.IsNullOrWhiteSpace(draftStateJson) ? draft.DraftStateJson : draftStateJson);
        ApplyFailureHistory(
            stateNode,
            ExtractFailureHistoryEntries(draft.DraftStateJson));
        stateNode["lastError"] = new JsonObject
        {
            ["code"] = errorCode,
            ["message"] = errorMessage,
            ["failedUtc"] = failedUtc.ToString("o"),
        };
        draft.DraftStateJson = stateNode.ToJsonString();

        RecordDraftEvent(draft, "runner", "fail", "success", beforeStatus, draft.Status, null, errorCode);
        await _db.SaveChangesAsync();
    }

    public bool ValidateAccessToken(ClaimSelectionDraftEntity draft, string? token)
    {
        if (string.IsNullOrWhiteSpace(draft.DraftAccessTokenHash)) return false;
        if (string.IsNullOrWhiteSpace(token)) return false;
        var hash = HashToken(token);
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(draft.DraftAccessTokenHash),
            Encoding.UTF8.GetBytes(hash));
    }

    public void RecordDraftEvent(
        ClaimSelectionDraftEntity draft,
        string actorType,
        string action,
        string result,
        string? beforeStatus,
        string? afterStatus,
        string? sourceIp = null,
        string? message = null)
    {
        _db.ClaimSelectionDraftEvents.Add(new ClaimSelectionDraftEventEntity
        {
            DraftId = draft.DraftId,
            TsUtc = DateTime.UtcNow,
            ActorType = NormalizeAuditField(actorType, "system", 32)!,
            Action = NormalizeAuditField(action, "unknown", 64)!,
            Result = NormalizeAuditField(result, "success", 32)!,
            BeforeStatus = NormalizeAuditField(beforeStatus, null, 32),
            AfterStatus = NormalizeAuditField(afterStatus, null, 32),
            SourceIp = NormalizeAuditField(sourceIp, null, DraftAuditSourceIpMaxLength),
            Message = NormalizeAuditField(message, null, DraftAuditMessageMaxLength),
        });
    }

    private static bool TryMergeDraftStateSelectedClaims(ClaimSelectionDraftEntity draft, string[] selectedClaimIds)
    {
        if (!TryMergeDraftStateSelectedClaims(draft.DraftStateJson, selectedClaimIds, out var mergedDraftStateJson))
            return false;

        draft.DraftStateJson = mergedDraftStateJson;
        return true;
    }

    private static bool TryMergeDraftStateSelectedClaims(
        string? draftStateJson,
        string[] selectedClaimIds,
        out string mergedDraftStateJson)
    {
        mergedDraftStateJson = draftStateJson ?? "{}";
        try
        {
            var state = ParseDraftStateNode(draftStateJson);
            state["selectedClaimIds"] = new JsonArray(selectedClaimIds.Select(id => JsonValue.Create(id)).ToArray());
            mergedDraftStateJson = state.ToJsonString();
            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private bool EnforceLazyExpiry(ClaimSelectionDraftEntity draft)
    {
        if (draft.Status is "COMPLETED" or "CANCELLED" or "EXPIRED") return false;
        if (draft.ExpiresUtc < DateTime.UtcNow)
        {
            var beforeStatus = draft.Status;
            draft.Status = "EXPIRED";
            draft.UpdatedUtc = DateTime.UtcNow;
            RecordDraftEvent(draft, "system", "expire", "success", beforeStatus, draft.Status);
            return true;
        }
        return false;
    }

    private static bool IsTerminalDraftState(ClaimSelectionDraftEntity draft)
    {
        return draft.FinalJobId != null || draft.Status is "COMPLETED" or "CANCELLED" or "EXPIRED";
    }

    private static JsonObject ParseDraftStateNode(string? draftStateJson)
    {
        if (string.IsNullOrWhiteSpace(draftStateJson))
            return new JsonObject();

        return JsonNode.Parse(draftStateJson)?.AsObject() ?? new JsonObject();
    }

    private static string MergePriorFailureDiagnostics(string? priorDraftStateJson, string nextDraftStateJson)
    {
        try
        {
            var nextState = ParseDraftStateNode(nextDraftStateJson);
            ApplyFailureHistory(nextState, ExtractFailureHistoryEntries(priorDraftStateJson));
            return nextState.ToJsonString();
        }
        catch (JsonException)
        {
            return nextDraftStateJson;
        }
    }

    private static void ApplyFailureHistory(JsonObject stateNode, IReadOnlyList<JsonObject> priorEntries)
    {
        var entries = ExtractFailureHistoryEntries(stateNode);
        entries.AddRange(priorEntries.Select(CloneJsonObject));
        var normalizedEntries = DeduplicateFailureHistory(entries);

        if (normalizedEntries.Count == 0)
        {
            stateNode.Remove("failureHistory");
            return;
        }

        stateNode["failureHistory"] = new JsonArray(
            normalizedEntries.Select(entry => CloneJsonNode(entry)).ToArray());
    }

    private static List<JsonObject> ExtractFailureHistoryEntries(string? draftStateJson)
    {
        if (string.IsNullOrWhiteSpace(draftStateJson))
            return new List<JsonObject>();

        try
        {
            return ExtractFailureHistoryEntries(ParseDraftStateNode(draftStateJson));
        }
        catch (JsonException)
        {
            return new List<JsonObject>();
        }
    }

    private static List<JsonObject> ExtractFailureHistoryEntries(JsonObject stateNode)
    {
        var entries = new List<JsonObject>();

        if (stateNode.TryGetPropertyValue("failureHistory", out var historyNode) &&
            historyNode is JsonArray historyArray)
        {
            foreach (var historyEntry in historyArray)
            {
                if (historyEntry is JsonObject historyEntryObject && HasFailureIdentity(historyEntryObject))
                    entries.Add(CloneJsonObject(historyEntryObject));
            }
        }

        if (stateNode.TryGetPropertyValue("lastError", out var lastErrorNode) &&
            lastErrorNode is JsonObject lastErrorObject &&
            HasFailureIdentity(lastErrorObject))
        {
            var lastErrorEntry = CloneJsonObject(lastErrorObject);
            if (!lastErrorEntry.ContainsKey("observability") &&
                stateNode.TryGetPropertyValue("observability", out var observabilityNode) &&
                observabilityNode is not null)
            {
                lastErrorEntry["observability"] = CloneJsonNode(observabilityNode);
            }
            entries.Add(lastErrorEntry);
        }

        return DeduplicateFailureHistory(entries);
    }

    private static List<JsonObject> DeduplicateFailureHistory(IEnumerable<JsonObject> entries)
    {
        var seen = new HashSet<string>(StringComparer.Ordinal);
        var normalized = new List<JsonObject>();

        foreach (var entry in entries)
        {
            if (!HasFailureIdentity(entry))
                continue;

            var key = string.Join(
                "\u001f",
                ReadJsonString(entry, "code") ?? "",
                ReadJsonString(entry, "message") ?? "",
                ReadJsonString(entry, "failedUtc") ?? "");

            if (seen.Add(key))
                normalized.Add(CloneJsonObject(entry));
        }

        if (normalized.Count <= MaxFailureHistoryEntries)
            return normalized;

        return normalized
            .Skip(normalized.Count - MaxFailureHistoryEntries)
            .ToList();
    }

    private static bool HasFailureIdentity(JsonObject entry)
    {
        return !string.IsNullOrWhiteSpace(ReadJsonString(entry, "code")) ||
               !string.IsNullOrWhiteSpace(ReadJsonString(entry, "message"));
    }

    private static string? ReadJsonString(JsonObject obj, string propertyName)
    {
        if (!obj.TryGetPropertyValue(propertyName, out var node) || node is null)
            return null;

        try
        {
            return node.GetValue<string>();
        }
        catch (InvalidOperationException)
        {
            return node.ToJsonString();
        }
    }

    private static JsonObject CloneJsonObject(JsonObject node)
    {
        return CloneJsonNode(node)?.AsObject() ?? new JsonObject();
    }

    private static JsonNode? CloneJsonNode(JsonNode? node)
    {
        return node is null ? null : JsonNode.Parse(node.ToJsonString());
    }

    private static int ExtractSelectionCap(string? draftStateJson)
    {
        if (string.IsNullOrWhiteSpace(draftStateJson))
            return LegacyDraftSelectionCap;

        try
        {
            using var doc = JsonDocument.Parse(draftStateJson);
            if (!doc.RootElement.TryGetProperty("selectionCap", out var selectionCapProp) ||
                selectionCapProp.ValueKind != JsonValueKind.Number ||
                !selectionCapProp.TryGetInt32(out var selectionCap))
            {
                return LegacyDraftSelectionCap;
            }

            return Math.Clamp(selectionCap, 1, AbsoluteClaimSelectionCap);
        }
        catch (JsonException)
        {
            return LegacyDraftSelectionCap;
        }
    }

    private static int GetEffectiveSelectionCap(string? draftStateJson, int candidateClaimCount)
    {
        var thresholdCap = ExtractSelectionCap(draftStateJson);
        return Math.Max(1, Math.Min(candidateClaimCount, thresholdCap));
    }

    private static string BuildSelectionCapError(int selectionCap)
    {
        return selectionCap == 1
            ? "Must select exactly 1 claim"
            : $"Must select between 1 and {selectionCap} claims";
    }

    private static int ResolveMaxRestartsPerDraft(IConfiguration configuration)
    {
        var configured = configuration.GetValue(
            "ClaimSelectionDrafts:MaxRestartsPerDraft",
            DefaultMaxRestartsPerDraft);
        return Math.Clamp(configured, 0, AbsoluteMaxRestartsPerDraft);
    }

    private static string BuildRestartLimitError(int maxRestarts)
    {
        return maxRestarts == 0
            ? "Draft restarts are disabled"
            : $"Draft restart limit reached ({maxRestarts})";
    }

    private static string? TryExtractObservabilityEventMessage(string? draftStateJson)
    {
        if (string.IsNullOrWhiteSpace(draftStateJson))
            return null;

        try
        {
            var state = JsonNode.Parse(draftStateJson)?.AsObject();
            return state?["observability"]?["eventMessage"]?.GetValue<string>();
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static bool TryExtractPreparedCandidateClaimIds(
        string? draftStateJson,
        out HashSet<string> candidateClaimIds,
        out string? error)
    {
        candidateClaimIds = new HashSet<string>(StringComparer.Ordinal);
        error = null;

        if (string.IsNullOrWhiteSpace(draftStateJson))
        {
            error = "Draft state is empty";
            return false;
        }

        try
        {
            using var doc = JsonDocument.Parse(draftStateJson);
            if (!doc.RootElement.TryGetProperty("preparedStage1", out var preparedStage1) ||
                preparedStage1.ValueKind != JsonValueKind.Object)
            {
                error = "Draft is missing preparedStage1";
                return false;
            }

            if (!preparedStage1.TryGetProperty("preparedUnderstanding", out var preparedUnderstanding) ||
                preparedUnderstanding.ValueKind != JsonValueKind.Object)
            {
                error = "Draft is missing preparedUnderstanding";
                return false;
            }

            if (!preparedUnderstanding.TryGetProperty("atomicClaims", out var atomicClaims) ||
                atomicClaims.ValueKind != JsonValueKind.Array)
            {
                error = "Draft is missing prepared candidate claims";
                return false;
            }

            foreach (var claim in atomicClaims.EnumerateArray())
            {
                if (!claim.TryGetProperty("id", out var claimIdProp) || claimIdProp.ValueKind != JsonValueKind.String)
                    continue;
                var claimId = claimIdProp.GetString();
                if (!string.IsNullOrWhiteSpace(claimId))
                    candidateClaimIds.Add(claimId);
            }

            if (candidateClaimIds.Count == 0)
            {
                error = "Draft has no prepared candidate claims";
                return false;
            }

            return true;
        }
        catch (JsonException)
        {
            error = "Draft state is malformed";
            return false;
        }
    }

    private static bool TryExtractIdleAutoProceedState(
        string? draftStateJson,
        out int selectionIdleAutoProceedMs,
        out DateTime lastSelectionInteractionUtc,
        out string[] selectedClaimIds,
        out HashSet<string> candidateClaimIds,
        out string? error)
    {
        selectionIdleAutoProceedMs = 0;
        lastSelectionInteractionUtc = DateTime.MinValue;
        selectedClaimIds = Array.Empty<string>();

        if (!TryExtractPreparedCandidateClaimIds(draftStateJson, out candidateClaimIds, out error))
        {
            return false;
        }

        if (string.IsNullOrWhiteSpace(draftStateJson))
        {
            error = "Draft state is empty";
            return false;
        }

        try
        {
            using var doc = JsonDocument.Parse(draftStateJson);

            if (doc.RootElement.TryGetProperty("selectionIdleAutoProceedMs", out var timeoutProp) &&
                timeoutProp.ValueKind == JsonValueKind.Number &&
                timeoutProp.TryGetInt32(out var parsedTimeout))
            {
                selectionIdleAutoProceedMs = Math.Max(0, parsedTimeout);
            }

            if (doc.RootElement.TryGetProperty("lastSelectionInteractionUtc", out var lastInteractionProp) &&
                lastInteractionProp.ValueKind == JsonValueKind.String &&
                DateTime.TryParse(
                    lastInteractionProp.GetString(),
                    null,
                    System.Globalization.DateTimeStyles.RoundtripKind,
                    out var parsedInteractionUtc))
            {
                lastSelectionInteractionUtc = parsedInteractionUtc.Kind == DateTimeKind.Utc
                    ? parsedInteractionUtc
                    : parsedInteractionUtc.ToUniversalTime();
            }

            if (doc.RootElement.TryGetProperty("selectedClaimIds", out var selectedClaimIdsProp) &&
                selectedClaimIdsProp.ValueKind == JsonValueKind.Array)
            {
                selectedClaimIds = selectedClaimIdsProp
                    .EnumerateArray()
                    .Select(element => element.GetString())
                    .Where(value => !string.IsNullOrWhiteSpace(value))
                    .Cast<string>()
                    .ToArray();
            }

            return true;
        }
        catch (JsonException)
        {
            error = "Draft state is malformed";
            return false;
        }
    }

    private static bool IsValidSelectedClaimSet(
        string[] selectedClaimIds,
        HashSet<string> candidateClaimIds,
        int selectionCap)
    {
        if (selectedClaimIds.Length < 1 || selectedClaimIds.Length > selectionCap)
            return false;
        if (selectedClaimIds.Length != selectedClaimIds.Distinct().Count())
            return false;
        return selectedClaimIds.All(candidateClaimIds.Contains);
    }

    private async Task<(bool claimed, string? error, bool contentionExhausted)> TryClaimInviteSlotForDraftAsync(string? code)
    {
        if (string.IsNullOrWhiteSpace(code)) return (false, "Invite code required", false);

        const int maxRetries = 3;
        var backoffMs = new[] { 50, 100, 200 };

        for (var attempt = 0; attempt <= maxRetries; attempt++)
        {
            try
            {
                using var tx = await _db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
                try
                {
                    var invite = await _db.InviteCodes.FindAsync(code);
                    if (invite == null)    { await tx.RollbackAsync(); return (false, "Invalid invite code", false); }
                    if (!invite.IsActive)  { await tx.RollbackAsync(); return (false, "Invite code is disabled", false); }
                    if (invite.ExpiresUtc.HasValue && invite.ExpiresUtc.Value < DateTime.UtcNow)
                        { await tx.RollbackAsync(); return (false, "Invite code has expired", false); }
                    if (invite.UsedJobs >= invite.MaxJobs)
                        { await tx.RollbackAsync(); return (false, $"Lifetime limit reached ({invite.MaxJobs} total)", false); }

                    // Hourly limit: count direct jobs plus draft creations.
                    // Jobs created from drafts are excluded because the draft already
                    // consumed the invite slot at creation time.
                    if (invite.HourlyLimit > 0)
                    {
                        var hourCutoff = DateTime.UtcNow.AddHours(-1);
                        var hourlyJobs = await _db.Jobs.CountAsync(j =>
                            j.InviteCode == code &&
                            j.CreatedUtc >= hourCutoff &&
                            j.ClaimSelectionDraftId == null);
                        var hourlyDrafts = await _db.ClaimSelectionDrafts.CountAsync(d => d.InviteCode == code && d.CreatedUtc >= hourCutoff);
                        if (hourlyJobs + hourlyDrafts >= invite.HourlyLimit)
                            { await tx.RollbackAsync(); return (false, $"Hourly limit reached ({invite.HourlyLimit}/hour). Try again in a few minutes.", false); }
                    }

                    var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);
                    if (invite.DailyLimit > 0)
                    {
                        var usage = await _db.InviteCodeUsage.FindAsync(code, today);
                        if (usage != null && usage.UsageCount >= invite.DailyLimit)
                            { await tx.RollbackAsync(); return (false, $"Daily limit reached ({invite.DailyLimit}/day). Try again after midnight UTC.", false); }
                    }

                    invite.UsedJobs++;

                    if (invite.DailyLimit > 0)
                    {
                        var usage = await _db.InviteCodeUsage.FindAsync(code, today);
                        if (usage == null)
                            _db.InviteCodeUsage.Add(new InviteCodeUsageEntity
                                { InviteCode = code, Date = today, UsageCount = 1 });
                        else
                            usage.UsageCount++;
                    }

                    await _db.SaveChangesAsync();
                    await tx.CommitAsync();
                    return (true, null, false);
                }
                catch
                {
                    await tx.RollbackAsync();
                    throw;
                }
            }
            catch (SqliteException ex) when (ex.SqliteErrorCode == 5)
            {
                if (attempt == maxRetries)
                {
                    _log.LogError(ex, "Draft invite slot claim failed after {Retries} retries. Code={InviteCode}", maxRetries, code);
                    return (false, "Service temporarily unavailable due to database contention. Please retry.", true);
                }
                await Task.Delay(backoffMs[attempt]);
            }
        }

        return (false, "Service temporarily unavailable due to database contention. Please retry.", true);
    }

    private static IQueryable<ClaimSelectionDraftEntity> ApplyAdminDraftFilters(
        IQueryable<ClaimSelectionDraftEntity> drafts,
        AdminDraftListQuery query)
    {
        if (query.Statuses.Count > 0)
        {
            drafts = drafts.Where(d => query.Statuses.Contains(d.Status));
        }
        else if (query.Scope == "active")
        {
            drafts = drafts.Where(d => ActiveAdminDraftStatuses.Contains(d.Status));
        }
        else if (query.Scope == "terminal")
        {
            drafts = drafts.Where(d => TerminalAdminDraftStatuses.Contains(d.Status));
        }

        drafts = query.Hidden switch
        {
            "exclude" => drafts.Where(d => !d.IsHidden),
            "only" => drafts.Where(d => d.IsHidden),
            _ => drafts,
        };

        drafts = query.Linked switch
        {
            "withFinalJob" => drafts.Where(d => d.FinalJobId != null),
            "withoutFinalJob" => drafts.Where(d => d.FinalJobId == null),
            _ => drafts,
        };

        if (!string.IsNullOrWhiteSpace(query.SelectionMode))
            drafts = drafts.Where(d => d.SelectionMode == query.SelectionMode);

        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            var search = query.Q.Trim();
            drafts = drafts.Where(d =>
                d.ActiveInputValue.Contains(search) ||
                d.OriginalInputValue.Contains(search));
        }

        return drafts;
    }

    private static AdminDraftSummary BuildAdminDraftSummary(ClaimSelectionDraftEntity draft)
    {
        var metadata = ExtractAdminDraftMetadata(draft.DraftStateJson);
        return new AdminDraftSummary(
            draft.DraftId,
            draft.Status,
            draft.Progress,
            draft.IsHidden,
            draft.SelectionMode,
            draft.ActiveInputType,
            BuildAdminPreview(string.IsNullOrWhiteSpace(draft.ActiveInputValue)
                ? draft.OriginalInputValue
                : draft.ActiveInputValue, AdminDraftInputPreviewMaxLength),
            draft.FinalJobId,
            draft.CreatedUtc,
            draft.UpdatedUtc,
            draft.ExpiresUtc,
            draft.RestartCount,
            draft.RestartedViaOther,
            metadata.hasPreparedStage1,
            metadata.lastErrorCode,
            draft.Status == "FAILED"
                ? null
                : BuildAdminPreview(draft.LastEventMessage, AdminDraftEventSummaryMaxLength));
    }

    private static (bool hasPreparedStage1, string? lastErrorCode) ExtractAdminDraftMetadata(string? draftStateJson)
    {
        if (string.IsNullOrWhiteSpace(draftStateJson))
            return (false, null);

        try
        {
            using var doc = JsonDocument.Parse(draftStateJson);
            var root = doc.RootElement;
            var hasPreparedStage1 =
                root.TryGetProperty("preparedStage1", out var preparedStage1) &&
                preparedStage1.ValueKind == JsonValueKind.Object;
            var lastErrorCode =
                root.TryGetProperty("lastError", out var lastError) &&
                lastError.ValueKind == JsonValueKind.Object &&
                lastError.TryGetProperty("code", out var code) &&
                code.ValueKind == JsonValueKind.String
                    ? code.GetString()
                    : null;
            return (hasPreparedStage1, BuildAdminPreview(lastErrorCode, AdminDraftEventSummaryMaxLength));
        }
        catch (JsonException)
        {
            return (false, null);
        }
    }

    private static string? BuildAdminPreview(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var normalized = string.Join(" ", value
            .Trim()
            .Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));

        if (normalized.Length <= maxLength)
            return normalized;

        return $"{normalized[..Math.Max(0, maxLength - 3)]}...";
    }

    private static string? NormalizeAuditField(string? value, string? fallback, int maxLength)
    {
        var normalized = string.IsNullOrWhiteSpace(value)
            ? fallback
            : string.Join(" ", value.Trim().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));

        if (string.IsNullOrWhiteSpace(normalized))
            return null;

        if (normalized.Length <= maxLength)
            return normalized;

        return normalized[..maxLength];
    }

    private static string GenerateAccessToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes);
    }

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
