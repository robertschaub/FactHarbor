using FactHarbor.Api.Helpers;
using FactHarbor.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FactHarbor.Api.Controllers;

public sealed record DraftStatusUpdateRequest(string status, int? progress, string? eventMessage);
public sealed record DraftPreparedRequest(string draftStateJson);
public sealed record DraftFailedRequest(string errorCode, string errorMessage);

[ApiController]
[Route("internal/v1/claim-selection-drafts")]
public sealed class InternalClaimSelectionDraftsController : ControllerBase
{
    private readonly ClaimSelectionDraftService _drafts;

    public InternalClaimSelectionDraftsController(ClaimSelectionDraftService drafts)
    {
        _drafts = drafts;
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

    [HttpPut("{draftId}/failed")]
    public async Task<IActionResult> PutFailed(string draftId, [FromBody] DraftFailedRequest req)
    {
        if (!AuthHelper.IsAdminKeyValid(Request)) return Unauthorized();

        await _drafts.StoreFailureAsync(draftId, req.errorCode, req.errorMessage);
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
}
