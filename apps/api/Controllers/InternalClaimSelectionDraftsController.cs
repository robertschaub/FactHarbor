using FactHarbor.Api.Helpers;
using FactHarbor.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FactHarbor.Api.Controllers;

public sealed record DraftStatusUpdateRequest(string status, int? progress, string? eventMessage);
public sealed record DraftPreparedRequest(string draftStateJson);
public sealed record DraftFailedRequest(string errorCode, string errorMessage, string? draftStateJson = null);
public sealed record DraftAutoConfirmRequest(string draftStateJson, string[] selectedClaimIds);

[ApiController]
[Route("internal/v1/claim-selection-drafts")]
public sealed class InternalClaimSelectionDraftsController : ControllerBase
{
    private readonly ClaimSelectionDraftService _drafts;
    private readonly JobService _jobs;
    private readonly RunnerClient _runner;
    private readonly FactHarbor.Api.Data.FhDbContext _db;
    private readonly ILogger<InternalClaimSelectionDraftsController> _log;

    public InternalClaimSelectionDraftsController(
        ClaimSelectionDraftService drafts,
        JobService jobs,
        RunnerClient runner,
        FactHarbor.Api.Data.FhDbContext db,
        ILogger<InternalClaimSelectionDraftsController> log)
    {
        _drafts = drafts;
        _jobs = jobs;
        _runner = runner;
        _db = db;
        _log = log;
    }

    [HttpPut("{draftId}/status")]
    public async Task<IActionResult> PutStatus(string draftId, [FromBody] DraftStatusUpdateRequest req)
    {
        if (!AuthHelper.IsAdminKeyValid(Request)) return Unauthorized();

        await _drafts.UpdateStatusAsync(draftId, req.status, req.progress, req.eventMessage);
        return Ok(new { ok = true });
    }

    [HttpPut("{draftId}/prepared")]
    public async Task<IActionResult> PutPrepared(string draftId, [FromBody] DraftPreparedRequest req)
    {
        if (!AuthHelper.IsAdminKeyValid(Request)) return Unauthorized();

        await _drafts.StorePreparedResultAsync(draftId, req.draftStateJson);
        return Ok(new { ok = true });
    }

    [HttpPost("{draftId}/auto-confirm")]
    public async Task<IActionResult> PostAutoConfirm(string draftId, [FromBody] DraftAutoConfirmRequest req)
    {
        if (!AuthHelper.IsAdminKeyValid(Request)) return Unauthorized();

        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var (draft, error, statusCode) = await _drafts.PrepareAutoContinueAsync(
                draftId,
                req.draftStateJson,
                req.selectedClaimIds);
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

    [HttpPut("{draftId}/failed")]
    public async Task<IActionResult> PutFailed(string draftId, [FromBody] DraftFailedRequest req)
    {
        if (!AuthHelper.IsAdminKeyValid(Request)) return Unauthorized();

        await _drafts.StoreFailureAsync(draftId, req.errorCode, req.errorMessage, req.draftStateJson);
        return Ok(new { ok = true });
    }

    [HttpGet("recoverable")]
    public async Task<IActionResult> GetRecoverable()
    {
        if (!AuthHelper.IsAdminKeyValid(Request)) return Unauthorized();

        var drafts = await _drafts.ListRecoverableDraftsAsync();
        return Ok(new
        {
            drafts = drafts.Select(d => new
            {
                draftId = d.DraftId,
                status = d.Status,
                createdUtc = d.CreatedUtc.ToString("o"),
                updatedUtc = d.UpdatedUtc.ToString("o"),
            }),
        });
    }

    [HttpGet("idle-auto-proceed-due")]
    public async Task<IActionResult> GetIdleAutoProceedDue()
    {
        if (!AuthHelper.IsAdminKeyValid(Request)) return Unauthorized();

        var drafts = await _drafts.ListIdleAutoProceedDueDraftsAsync();
        return Ok(new
        {
            drafts = drafts.Select(d => new
            {
                draftId = d.DraftId,
                draftStateJson = d.DraftStateJson,
                selectedClaimIds = d.SelectedClaimIds,
            }),
        });
    }

    private async Task TriggerRunnerBestEffortAsync(string jobId)
    {
        try
        {
            await _runner.TriggerRunnerAsync(jobId);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Runner trigger failed for auto-confirmed draft job. JobId={JobId}", jobId);
            try
            {
                await _jobs.UpdateStatusAsync(jobId, "FAILED", 100, "error", $"Runner trigger failed: {ex.Message}");
            }
            catch
            {
                // Best-effort only.
            }
        }
    }
}
