using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using FactHarbor.Api.Data;
using FactHarbor.Api.Helpers;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace FactHarbor.Api.Services;

public sealed class ClaimSelectionDraftService
{
    private readonly FhDbContext _db;
    private readonly ILogger<ClaimSelectionDraftService> _log;

    public ClaimSelectionDraftService(FhDbContext db, ILogger<ClaimSelectionDraftService> log)
    {
        _db = db;
        _log = log;
    }

    public sealed record CreateDraftResult(
        string DraftId,
        string DraftAccessToken,
        string Status);

    public async Task<(CreateDraftResult? result, string? error, int statusCode)> CreateDraftAsync(
        string inputType,
        string inputValue,
        string selectionMode,
        string? inviteCode,
        bool isAdmin)
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
        await _db.SaveChangesAsync();

        return (new CreateDraftResult(draft.DraftId, accessToken, draft.Status), null, 0);
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

        if (selectedClaimIds.Length < 1 || selectedClaimIds.Length > 5)
            return (null, "Must select between 1 and 5 claims", 400);

        if (selectedClaimIds.Length != selectedClaimIds.Distinct().Count())
            return (null, "Duplicate claim IDs", 400);

        if (!TryExtractPreparedCandidateClaimIds(draft.DraftStateJson, out var candidateClaimIds, out var extractionError))
            return (null, extractionError ?? "Draft is missing prepared candidate claims", 409);

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
        string newInputValue)
    {
        var (valid, validationError) = AnalyzeInputValidator.Validate(newInputType, newInputValue);
        if (!valid) return (null, validationError, 400);

        var draft = await _db.ClaimSelectionDrafts.FindAsync(draftId);
        if (draft is null) return (null, "Draft not found", 404);
        if (EnforceLazyExpiry(draft))
            await _db.SaveChangesAsync();

        if (draft.Status == "EXPIRED")
            return (null, "Draft has expired", 410);
        if (draft.Status == "COMPLETED")
            return (null, "Draft already confirmed", 409);
        if (draft.Status == "PREPARING")
            return (null, "Draft is currently being prepared — wait for it to finish or cancel it first", 409);

        draft.ActiveInputType = newInputType;
        draft.ActiveInputValue = newInputValue;
        draft.RestartedViaOther = true;
        draft.RestartCount++;
        draft.Status = "QUEUED";
        draft.Progress = 0;
        draft.DraftStateJson = null;
        draft.UpdatedUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return (draft, null, 0);
    }

    public async Task<(ClaimSelectionDraftEntity? draft, string? error, int statusCode)> CancelDraftAsync(string draftId)
    {
        var draft = await _db.ClaimSelectionDrafts.FindAsync(draftId);
        if (draft is null) return (null, "Draft not found", 404);
        if (EnforceLazyExpiry(draft))
            await _db.SaveChangesAsync();

        if (draft.Status is "COMPLETED" or "CANCELLED" or "EXPIRED")
        {
            return (draft, null, 0);
        }

        draft.Status = "CANCELLED";
        draft.UpdatedUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return (draft, null, 0);
    }

    public async Task<(ClaimSelectionDraftEntity? draft, string? error, int statusCode)> RetryDraftAsync(string draftId)
    {
        var draft = await _db.ClaimSelectionDrafts.FindAsync(draftId);
        if (draft is null) return (null, "Draft not found", 404);
        if (EnforceLazyExpiry(draft))
            await _db.SaveChangesAsync();

        if (draft.Status == "EXPIRED")
            return (null, "Draft has expired", 410);
        if (draft.Status != "FAILED")
            return (null, $"Only FAILED drafts can be retried, current status: {draft.Status}", 409);

        draft.Status = "QUEUED";
        draft.Progress = 0;
        draft.UpdatedUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return (draft, null, 0);
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

        draft.Status = status;
        if (progress.HasValue) draft.Progress = progress.Value;
        draft.UpdatedUtc = DateTime.UtcNow;
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
        if (IsTerminalDraftState(draft))
            return;

        draft.DraftStateJson = draftStateJson;
        draft.Status = "AWAITING_CLAIM_SELECTION";
        draft.UpdatedUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task StoreFailureAsync(string draftId, string errorCode, string errorMessage)
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

        draft.Status = "FAILED";
        draft.UpdatedUtc = DateTime.UtcNow;

        var stateNode = ParseDraftStateNode(draft.DraftStateJson);
        stateNode["lastError"] = new JsonObject
        {
            ["code"] = errorCode,
            ["message"] = errorMessage,
        };
        draft.DraftStateJson = stateNode.ToJsonString();

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

    private static bool TryMergeDraftStateSelectedClaims(ClaimSelectionDraftEntity draft, string[] selectedClaimIds)
    {
        try
        {
            var state = ParseDraftStateNode(draft.DraftStateJson);
            state["selectedClaimIds"] = new JsonArray(selectedClaimIds.Select(id => JsonValue.Create(id)).ToArray());
            draft.DraftStateJson = state.ToJsonString();
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
            draft.Status = "EXPIRED";
            draft.UpdatedUtc = DateTime.UtcNow;
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
