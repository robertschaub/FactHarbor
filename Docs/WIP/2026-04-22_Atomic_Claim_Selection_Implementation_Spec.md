---
title: Atomic Claim Selection - v1 Implementation Spec
date: 2026-04-22
authors: Lead Architect, GitHub Copilot (GPT-5.4)
status: Draft for implementation review
scope: Pre-job AtomicClaim selection over the current Stage 1 final claim set
requires: Captain approval, Lead Developer implementation review
related:
  - Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_LLM_Expert_Atomic_Claim_Selection_Requirement_Refinement.md
  - Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_LLM_Expert_Atomic_Claim_Selection_Debate.md
  - Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Atomic_Claim_Selection_Interactive_Default.md
  - Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Clarified_Order_ACS_CheckWorthiness_TopLevelProposition.md
  - Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Debate_CheckWorthiness_Before_ACS.md
  - Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Documentation_Update_ACS_CheckWorthiness_TopLevelProposition.md
  - Docs/WIP/2026-04-20_Dominant_Proposition_Architecture_Plan.md
  - Docs/STATUS/Backlog.md
  - Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Atomic_Claim_Selection_Check_Worthiness_Proposal.md
  - Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Atomic_Claim_Selection_Check_Worthiness_Review_Followup.md
  - apps/web/src/app/analyze/page.tsx
  - apps/web/src/lib/analyzer/claim-extraction-stage.ts
  - apps/web/src/lib/analyzer/claimboundary-pipeline.ts
  - apps/api/Controllers/AnalyzeController.cs
  - apps/api/Services/JobService.cs
---

# Atomic Claim Selection - v1 Implementation Spec

## 1. Purpose

This document consolidates the April 22 handovers into one implementation-ready design for Atomic Claim Selection.

The goal is narrow:

- keep the current Stage 1 extraction semantics unchanged
- show the user the exact final `CBClaimUnderstanding.atomicClaims` that Stage 1 would send into analysis today
- let the user choose which claims proceed into Stage 2+
- support an explicit automatic mode without introducing a live paused-job checkpoint

This document intentionally does not revive the older clarification-gate design in [Docs/WIP/2026-04-10_Claim_Clarification_Gate_Design.md](2026-04-10_Claim_Clarification_Gate_Design.md). That design assumes a live job pause, a wizard, and resume semantics inside `JobEntity`, which the newer Atomic Claim Selection debate rejected for v1.

Sequencing clarification (2026-04-22):

- this document remains the first delivery surface for the broader claim-selection track
- the approved Check-worthiness improvement belongs inside this ACS flow as the post-Gate-1 recommendation layer
- `topLevelProposition` remains a later, separate Stage-1 contract extension and must not be introduced into ACS v1 semantics
- backlog tracking now reflects that split explicitly as `ACS-1`, `ACS-CW-1`, and later `TOPPROP-1`

## 2. Closed decisions

The following items are settled for v1 and should be treated as implementation constraints, not open questions:

1. The selectable list is exactly the final `CBClaimUnderstanding.atomicClaims` returned by the current Stage 1 flow.
2. The selection step does not create, merge, split, rewrite, or drop claims on its own.
3. The recommendation uses one batched LLM surface over the final candidate claims and preselects up to 3. It ranks already-surviving candidates; it is not a second Stage 1 filtering authority.
4. The current Stage 1 `checkWorthiness` field is advisory only and must not become the authoritative Atomic Claim pre-selection mechanism.
5. v1 keeps the recommendation as a distinct post-Gate-1 batched call because it must operate on the exact final candidate set shown to the user and must persist a user-facing audit trail separate from Gate 1 filtering telemetry.
6. The initial recommendation label contract is a provisional FactHarbor v1 simplification inspired by ZHAW lessons, not a direct empirical transfer. ViClaim is multi-label, so mixed fact-plus-opinion claims remain possible even though v1 stores one primary triage label per claim.
7. The user may select at most 5 claims.
8. `interactive` is the default mode.
9. `automatic` is supported only through an explicit non-interactive user preference.
10. In `automatic` mode, the recommendation output is the effective post-Stage-1 selection filter: `recommendedClaimIds` become `selectedClaimIds`, and only the selected claims proceed to Stage 2+.
11. That automatic-mode filter is still downstream of Gate 1 and contract validation. It does not change which claims are valid Stage-1 candidates; it changes which already-valid candidates receive research and verdict generation.
12. v1 uses a pre-job draft/intake object. It does not add a live post-Stage-1 waiting state to `JobEntity`.
13. `Other` is treated as a fresh input restart inside the draft flow, before claim extraction.
14. v1 does not introduce `topLevelProposition` and does not change current Stage 1 extraction semantics.
15. v1 does not add a clarification wizard.
16. Pre-ACS Check-worthiness work, if any, stays internal telemetry/prototyping only. v1 does not ship a separate external recommendation service contract outside the ACS draft/prepared-job flow.

## 3. Working terminology

- `candidateClaims` = the exact final `understanding.atomicClaims` emitted by Stage 1 for the current draft input.
- `recommendedClaimIds` = the up-to-3 claim IDs preselected by the recommendation LLM.
- `selectedClaimIds` = the final claim IDs confirmed for downstream analysis.
- `claim selection draft` = the new pre-job intake object that owns Stage 1 preparation, recommendation, and `Other` restarts.
- `prepared Stage 1 snapshot` = the full `CBClaimUnderstanding` object captured during draft preparation and copied onto the final job so the real analysis can skip Stage 1 safely.
- `authoritative payload` = the single JSON blob at a given persistence layer that other fields must derive from rather than duplicate.

## 4. End-to-end user flow

### 4.1 Interactive default

1. The user submits input from [apps/web/src/app/analyze/page.tsx](../../apps/web/src/app/analyze/page.tsx).
2. The UI calls a new draft endpoint instead of calling `/api/fh/analyze` directly.
3. The API validates the input using the same rules as `AnalyzeController.ValidateRequest(...)`, claims the invite slot once, creates a `ClaimSelectionDraftEntity`, and triggers draft preparation on the runner.
4. The runner executes the current Stage 1 flow against the draft input, producing a full `CBClaimUnderstanding` snapshot.
5. The runner executes a separate recommendation LLM call against the resulting candidate claims.
6. The draft enters `AWAITING_CLAIM_SELECTION` and stores:
  - the prepared Stage 1 snapshot as part of the authoritative draft payload
   - the ranked claim IDs
   - the recommended claim IDs
   - the default selected claim IDs (equal to the recommendation)
7. The UI renders the claim chooser at `/analyze/select/[draftId]`.
8. The user either:
   - confirms 1-5 selected claims, or
   - switches to `Other`, replaces the input, and reruns draft preparation.
9. On confirmation, the API creates a real `JobEntity`, copies the prepared Stage 1 snapshot plus selection metadata onto the job, and triggers the normal runner queue.
10. The user is redirected to `/jobs/[jobId]` only after the real job exists.

### 4.2 Automatic mode

1. The user enables a non-interactive preference in the analyze UI.
2. The UI still creates a draft first.
3. The runner prepares the Stage 1 snapshot and recommendation exactly as in interactive mode.
4. After recommendation succeeds, the API auto-confirms `recommendedClaimIds`, creates the real job, and marks the draft complete.
5. The UI redirects to `/jobs/[jobId]` as soon as `finalJobId` is available.

Automatic mode therefore skips the chooser UI, but it does not bypass draft preparation. This keeps one preparation path for both modes and guarantees that the automatic path uses the same candidate set and recommendation output as the interactive path.

In automatic mode, the recommendation is therefore the final post-Stage-1 selection authority for downstream analysis. This is a selection filter over already-valid candidate claims, not a replacement for Gate 1 or contract validation.

### 4.3 `Other` restart

1. The user checks `Other` on the selection page.
2. All claim selections are cleared and disabled.
3. A free-input field is enabled.
4. On submit, the draft keeps the same `draftId`, increments `restartCount`, sets `restartedViaOther = true`, replaces the active input, recomputes `activeInputType` from that replacement input, and reruns the same draft-preparation path from the beginning.
5. No new invite slot is claimed for `Other` restarts inside the same draft.

Using the same `draftId` is the simplest way to express the requirement that `Other` is a fresh analysis attempt from the user's perspective without mutating `JobEntity` semantics. The pre-job draft owns the restart history; the actual job is created only after the final confirmation step.

## 5. Concrete design choices that close the handover gaps

### 5.1 No new live job state in v1

The earlier refinement suggested a dedicated waiting state such as `AWAITING_CLAIM_SELECTION` rather than `PAUSED`. The debated baseline changed the owning object: the waiting state belongs to the new draft entity, not to `JobEntity`.

Result:

- `ClaimSelectionDraftEntity.Status` may use `AWAITING_CLAIM_SELECTION`
- `JobEntity.Status` remains the current real-job lifecycle (`QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED`, `CANCELLED`)
- the jobs page SSE/status behavior remains unchanged because no job exists until the user confirms selection

This avoids reopening the job-status, SSE, and retry surfaces that already have fragile behavior around live jobs.

### 5.2 Invite-slot accounting happens at draft creation

Draft preparation runs the real Stage 1 extraction flow plus an additional recommendation call. That work consumes meaningful resources, so the invite slot must be claimed once when the draft is created, not when the final job is confirmed.

Concrete rule:

- `POST /v1/claim-selection-drafts` claims the invite slot once
- confirming the draft into a real job does not claim a second slot
- `Other` restarts within the same draft do not claim another slot
- abandoned or expired drafts are not refunded automatically, because Stage 1 preparation has already consumed resources
- failed preparation or recommendation may be retried within the same non-expired draft without claiming another invite slot
- the current `JobService.TryClaimInviteSlotAsync(...)` logic cannot be reused unchanged for drafts, because its rolling hourly limit currently counts rows in `Jobs` only
- ACS v1 must therefore extract or adapt that slot-claiming logic so lifetime/daily usage is claimed at draft creation time and the rolling hourly limit is enforced against draft creation records rather than only confirmed jobs

This is stricter than "charge only on final job creation", but it matches the actual resource cost and avoids a free repeated-Stage-1 abuse vector.

### 5.3 Non-interactive preference is browser-local in v1

There is no authenticated per-user settings model in the current product. v1 therefore stores the user's claim-selection preference in `localStorage`, reusing the same pattern already used on the analyze page for invite code persistence.

Concrete rule:

- new key: `fh_claim_selection_mode`
- values: `interactive` or `automatic`
- the analyze page reads the stored value and sends it with draft creation
- the draft persists the submitted mode as immutable metadata for auditability

This is enough to satisfy "non-interactive user configuration" without inventing a broader account-settings subsystem.

### 5.4 Recommendation failure is blocking, not silently degraded

The handovers explicitly reject a deterministic fallback ranking. v1 therefore treats recommendation failure as a recoverable draft failure.

Concrete rule:

- if Stage 1 succeeds but the recommendation call fails, the draft enters `FAILED`
- candidate claims may remain persisted for diagnostics, but the draft cannot be confirmed until recommendation succeeds
- the UI shows a retry action for recommendation failure
- automatic mode cannot continue when recommendation fails

This keeps the contract honest: the system either has an LLM recommendation or it does not continue.

### 5.5 Unselected claims are audit metadata, not primary report content

The final job result will preserve claim-selection provenance, but unselected claims should not be rendered as if they were analyzed verdict-bearing claims.

Concrete rule:

- the job report gets a collapsed secondary panel called `Claim selection`
- that panel shows the full candidate set, recommendation, final selected set, mode, and `restartedViaOther`
- the main verdict narrative, claim cards, and aggregate scoring only use the selected claims

### 5.6 Queryable row truth plus one rich payload per layer

The first version of this spec duplicated too much overlapping JSON across draft state, prepared job state, and claim-selection metadata. v1 should keep queryable lifecycle fields on the draft row and use JSON only for rich detail that should not be split into many columns.

Concrete rule:

- at the draft layer, row columns such as `Status`, `Progress`, `SelectionMode`, `RestartedViaOther`, `RestartCount`, `OriginalInputType`, `ActiveInputType`, `OriginalInputValue`, `ActiveInputValue`, `ExpiresUtc`, and `FinalJobId` are the queryable lifecycle truth
- `DraftStateJson` is the authoritative rich-detail store for the prepared Stage 1 snapshot, resolved input text, selection state, recommendation output, and draft-local errors
- draft writes must update the row projection and `DraftStateJson` in the same transaction; if a merged API response ever sees drift, row values win for lifecycle fields and JSON values win for rich detail
- at the job layer, `PreparedStage1Json` is authoritative for the prepared Stage 1 snapshot and Stage 1 provenance needed to start at Stage 2 without re-fetching the input
- `ClaimSelectionJson` stores only the selection-specific metadata not already structurally carried by `PreparedStage1Json`
- `resultJson.claimSelection` is a report-facing projection, not a second primary persistence contract

This keeps the implementation auditable without forcing every consumer to reconcile multiple overlapping sources of truth.

## 6. Data model

### 6.1 New API entity: `ClaimSelectionDraftEntity`

Add a new entity in [apps/api/Data/Entities.cs](../../apps/api/Data/Entities.cs) and register it in [apps/api/Data/FhDbContext.cs](../../apps/api/Data/FhDbContext.cs).

```csharp
public sealed class ClaimSelectionDraftEntity
{
    [Key]
    public string DraftId { get; set; } = Guid.NewGuid().ToString("N");

    public string Status { get; set; } = "QUEUED";
    public int Progress { get; set; } = 0;

    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedUtc { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresUtc { get; set; } = DateTime.UtcNow.AddHours(24);

    public string OriginalInputType { get; set; } = "text";
    public string ActiveInputType { get; set; } = "text";
    public string OriginalInputValue { get; set; } = "";
    public string ActiveInputValue { get; set; } = "";

    public string PipelineVariant { get; set; } = "claimboundary";
    public string? InviteCode { get; set; }

    public string SelectionMode { get; set; } = "interactive";
    public bool RestartedViaOther { get; set; } = false;
    public int RestartCount { get; set; } = 0;

    public string? DraftStateJson { get; set; }

    public string? DraftAccessTokenHash { get; set; }
    public string? FinalJobId { get; set; }
}
```

Recommended draft statuses:

- `QUEUED`
- `PREPARING`
- `AWAITING_CLAIM_SELECTION`
- `AUTO_CONTINUING`
- `COMPLETED`
- `FAILED`
- `CANCELLED`
- `EXPIRED`
- `SUPERSEDED`

`SUPERSEDED` is only needed if we later support duplicate drafts or admin replacements. It can be deferred from the first migration if the implementation stays single-draft-per-submit.

### 6.2 Draft JSON contract

`DraftStateJson` is the authoritative rich-detail payload and should serialize TypeScript contracts in [apps/web/src/lib/analyzer/types.ts](../../apps/web/src/lib/analyzer/types.ts):

```ts
export interface PreparedStage1Snapshot {
  version: 1;
  // Exact analysis text that cold-start Stage 1 used after URL fetch /
  // auto-fetch normalization. For plain text inputs this equals the active
  // input text. Prepared jobs must use this instead of re-fetching URLs.
  resolvedInputText: string;
  preparedUnderstanding: CBClaimUnderstanding;
}

export interface ClaimSelectionDraftState {
  version: 1;
  preparedStage1?: PreparedStage1Snapshot;
  rankedClaimIds: string[];
  recommendedClaimIds: string[];
  selectedClaimIds: string[];
  recommendationRationale?: string;
  assessments: ClaimSelectionRecommendationAssessment[];
  lastError?: {
    code:
      | "stage1_failed"
      | "recommendation_failed"
      | "invalid_selection"
      | "draft_token_invalid"
      | "draft_expired";
    message: string;
  };
}
```

The candidate set for selection is always `draftState.preparedStage1.preparedUnderstanding.atomicClaims`. No second candidate-claim blob is needed at the draft layer.

On every create and `Other` restart, the server recomputes `activeInputType` from `activeInputValue` using the same parsing rules as the current `/analyze` flow, then persists that value on the draft row. Lifecycle fields such as `status`, `selectionMode`, and `restartCount` stay on the row rather than being duplicated inside `DraftStateJson`.

### 6.3 Job entity additions

Add the following nullable columns to `JobEntity` in [apps/api/Data/Entities.cs](../../apps/api/Data/Entities.cs):

```csharp
public string? ClaimSelectionDraftId { get; set; }
public string? PreparedStage1Json { get; set; }
public string? ClaimSelectionJson { get; set; }
```

Use them as follows:

- `ClaimSelectionDraftId` = provenance link back to the draft
- `PreparedStage1Json` = the immutable prepared Stage 1 snapshot copied from the confirmed draft (`resolvedInputText` + `preparedUnderstanding`)
- `ClaimSelectionJson` = immutable selection metadata plus recommendation audit snapshot used by the runner and report UI

`PreparedStage1Json` makes the final job self-contained. The runner does not need to read the draft again after job creation, and prepared jobs do not need to re-fetch URL content.

### 6.4 Job-level claim-selection metadata

`ClaimSelectionJson` should serialize:

```ts
export interface ClaimSelectionMetadata {
  version: 1;
  selectionMode: "interactive" | "automatic";
  restartedViaOther: boolean;
  restartCount: number;
  rankedClaimIds: string[];
  recommendedClaimIds: string[];
  selectedClaimIds: string[];
  recommendationRationale?: string;
  assessments: ClaimSelectionRecommendationAssessment[];
}
```

Persistence rule:

- the draft remains the authoritative pre-confirmation record
- on confirm, the full recommendation snapshot (`rankedClaimIds`, `recommendedClaimIds`, `recommendationRationale`, and `assessments`) is copied unchanged into `ClaimSelectionJson`
- the job copy is immutable audit history for the final report and must not be recomputed from the draft later
- if job creation succeeds and `FinalJobId` is persisted but a later draft-status write lags or fails, `FinalJobId != null` is the completion witness for reads and recovery logic

This satisfies the persistence requirement together with `PreparedStage1Json`: the full candidate claim set lives in the prepared Stage 1 snapshot, while the selection metadata and recommendation audit snapshot live in `ClaimSelectionJson`.

`resultJson.claimSelection` should be a derived projection built at result-store time for the report UI. It is not a second authoritative store.

## 7. API surface

### 7.1 Public API (.NET)

Add a new controller pair:

- [apps/api/Controllers/ClaimSelectionDraftsController.cs](../../apps/api/Controllers/ClaimSelectionDraftsController.cs)
- [apps/api/Controllers/InternalClaimSelectionDraftsController.cs](../../apps/api/Controllers/InternalClaimSelectionDraftsController.cs)

Public routes:

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/v1/claim-selection-drafts` | Validate input, claim invite slot, create draft, return `draftId` plus `draftAccessToken` |
| `GET` | `/v1/claim-selection-drafts/{draftId}` | Read current draft status/state |
| `POST` | `/v1/claim-selection-drafts/{draftId}/confirm` | Validate 1-5 selected IDs, create the real job, complete draft |
| `POST` | `/v1/claim-selection-drafts/{draftId}/restart` | Submit `Other` replacement input and rerun preparation |
| `POST` | `/v1/claim-selection-drafts/{draftId}/cancel` | Cancel abandoned draft from UI |
| `POST` | `/v1/claim-selection-drafts/{draftId}/retry` | Retry failed preparation or recommendation within the same draft and quota claim |

Internal routes:

| Method | Path | Purpose |
| --- | --- | --- |
| `PUT` | `/internal/v1/claim-selection-drafts/{draftId}/status` | Update draft status/progress/event message from runner |
| `PUT` | `/internal/v1/claim-selection-drafts/{draftId}/prepared` | Persist prepared Stage 1 snapshot plus recommendation output |
| `PUT` | `/internal/v1/claim-selection-drafts/{draftId}/failed` | Persist a structured failure reason |

### 7.2 Next.js proxy routes

Mirror the public routes under [apps/web/src/app/api/fh](../../apps/web/src/app/api/fh):

- `app/api/fh/claim-selection-drafts/route.ts`
- `app/api/fh/claim-selection-drafts/[id]/route.ts`
- `app/api/fh/claim-selection-drafts/[id]/confirm/route.ts`
- `app/api/fh/claim-selection-drafts/[id]/restart/route.ts`
- `app/api/fh/claim-selection-drafts/[id]/cancel/route.ts`
- `app/api/fh/claim-selection-drafts/[id]/retry/route.ts`

These proxies should forward either:

- `X-Admin-Key` for admin sessions, or
- `X-Draft-Token` for ordinary browser access to a draft

### 7.3 Draft access token

Because drafts exist before a public job exists, v1 should not expose them as openly readable by ID alone.

Concrete rule:

- `POST /v1/claim-selection-drafts` returns `draftId` and a random `draftAccessToken`
- the browser stores the token in `sessionStorage`
- all subsequent draft reads/mutations send `X-Draft-Token`
- the API stores only a hash of the token on the draft row
- admins can bypass token checks with the admin key

Recovery contract for v1:

- same-tab reload is supported because `sessionStorage` survives reloads in the same tab
- opening the draft URL in a new tab or new browser session without an admin key is not guaranteed to work and is out of scope for v1
- if draft access is lost client-side, the supported recovery path is to restart from `/analyze` unless the viewer is an admin

Day-2 UX note:

- storing draft tokens in `localStorage` keyed by `draftId` is a reasonable post-v1 improvement if multi-tab recovery becomes a common support issue
- that change does not alter the server-side security model; it is a client persistence improvement only

This gives the draft flow minimal access control without requiring a full user-account model.

### 7.4 Draft expiry and quota semantics

Drafts are short-lived intake artifacts, not durable user workspaces.

Concrete rule:

- each draft receives `ExpiresUtc = CreatedUtc + 24 hours`
- expired drafts move to `EXPIRED` and cannot be confirmed, restarted, or retried
- retries of failed preparation or recommendation inside the same non-expired draft do not consume another invite slot
- creating a brand-new draft after expiry, cancellation, or explicit abandonment claims a new invite slot
- expiry is enforced lazily on read or mutation in v1: any GET or mutation that observes `ExpiresUtc < UtcNow` transitions the draft to `EXPIRED` before returning
- a proactive background expiry sweep is deferred to post-v1

This keeps quota behavior explicit while still allowing recovery from transient preparation failures.

## 8. Runner and pipeline integration

### 8.1 Reuse the same Stage 1 code path

The candidate set must be identical to what the current pipeline would analyze today. Therefore the draft-preparation flow must call the same Stage 1 implementation, not a fork.

Concrete refactor:

1. Extract the current **Stage 1 preparation boundary** from [apps/web/src/lib/analyzer/claimboundary-pipeline.ts](../../apps/web/src/lib/analyzer/claimboundary-pipeline.ts) into a shared helper such as `prepareStage1Snapshot(...)`.
2. That helper boundary is broader than `extractClaims(state)` alone. It must cover:
   - startup config loading needed before URL fetch and runtime provenance capture
   - URL pre-fetch / URL-looking-text auto-fetch normalization to produce the exact `analysisText`
   - construction of a minimal Stage-1 `CBResearchState`
   - `extractClaims(state)`
   - the same post-extract contract-preservation gate used by the cold-start path
3. The helper should return the prepared snapshot needed later by ACS:

```ts
export interface PreparedStage1Snapshot {
  version: 1;
  resolvedInputText: string;
  preparedUnderstanding: CBClaimUnderstanding;
}
```

4. Use that helper in two places:
   - the normal cold-start pipeline path
   - the new draft-preparation runner path
5. If `preparedStage1.preparedUnderstanding.contractValidationSummary?.preservesContract === false`, draft preparation must stop at that same boundary and mark the draft `FAILED` with `lastError.code = "stage1_failed"`; recommendation does not run on a damaged Stage 1 result.

Implementation note:

- The first implementation does not need to fully untangle all current config loads inside `extractClaims(...)`. The hard requirement is behavioral parity with the cold-start path, not zero-duplication of config access on day 1.
- The Stage-2-only parts of `CBResearchState` (ledgers, iteration counters, boundaries, evidence pool) can stay empty/minimal during draft preparation. They become meaningful only when the pipeline continues into research.

This guarantees that the Stage 1 candidate set and the real pipeline stay aligned by construction.

### 8.2 New recommendation module

Add [apps/web/src/lib/analyzer/claim-selection-recommendation.ts](../../apps/web/src/lib/analyzer/claim-selection-recommendation.ts).

Rationale:

- The recent ZHAW comparison material in [Docs/Meetings/2026-04-22_ZHAW_Kurzreader.md](../Meetings/2026-04-22_ZHAW_Kurzreader.md), [Docs/Knowledge/ViClaim_EMNLP2025_Lessons_for_FactHarbor.md](../Knowledge/ViClaim_EMNLP2025_Lessons_for_FactHarbor.md), [Docs/Knowledge/CheckThat_Lab_Lessons_for_FactHarbor.md](../Knowledge/CheckThat_Lab_Lessons_for_FactHarbor.md), and [Docs/Knowledge/HAMiSoN_Lessons_for_FactHarbor.md](../Knowledge/HAMiSoN_Lessons_for_FactHarbor.md) points in the same direction: check-worthiness is not well modeled as one loose binary scalar. The stronger framing is explicit triage between fact-check-worthy claims, factual-but-not-worth-checking claims, and opinion/subjective content.
- That also matches the current FactHarbor implementation. Today the active Stage 1 Gate 1 path is not driven primarily by `checkWorthiness`; it filters on failed opinion+specificity and on grounded claims that fall below the specificity threshold, while Gate 1 fidelity is telemetry-only there and contract validation remains the fidelity authority. Reusing the existing extracted `checkWorthiness` field as the authoritative selector would therefore overstate what that field currently means.

Proposal:

- keep `AtomicClaim.checkWorthiness` as an audit/debug signal if useful
- do not use it as the sole or primary auto-selection rule
- add a fresh batched recommendation call that is designed specifically for pre-selection of the final Stage 1 candidate set
- treat the label contract below as a provisional FactHarbor v1 product decision inspired by ZHAW lessons, not as a direct transfer of ViClaim or CheckThat taxonomy

Rollout clarification:

- in `interactive` mode, this module powers ranking, recommendation, and default preselection
- in `automatic` mode, this module becomes the effective post-Stage-1 selection filter because `recommendedClaimIds` are auto-promoted to `selectedClaimIds`
- if implementation starts before the full chooser UI is exposed, any earlier use of this module must stay inside the same draft/prepared-job architecture or internal telemetry; it must not become a separate pre-ACS public service contract

Why this remains a distinct post-Gate-1 batched call:

- it must run on the exact final candidate set that will be shown in the chooser UI
- it ranks and explains already-surviving claims; it must not become a second hidden filtering authority
- its output must persist as user-facing audit data separate from Gate 1 telemetry and contract-validation artifacts
- it is still one batched call over the full set, not per-claim mini-calls

Input:

- original input
- `impliedClaim`
- `articleThesis`
- final `atomicClaims`

Output:

Canonical type definitions for `PreparedStage1Snapshot`, `ClaimSelectionRecommendationAssessment`, and `ClaimSelectionRecommendation` must live in [apps/web/src/lib/analyzer/types.ts](../../apps/web/src/lib/analyzer/types.ts). The inline shapes below document the expected contract and must not become a second divergent source of truth relative to `types.ts` or [2026-04-22_Check_Worthiness_Recommendation_Design.md](2026-04-22_Check_Worthiness_Recommendation_Design.md).

```ts
export interface ClaimSelectionRecommendationAssessment {
  claimId: string;
  // Provisional FactHarbor v1 primary label.
  // ViClaim itself is multi-label, so this is an implementation simplification
  // for selection UX, not a claim that mixed factual+opinion cases do not exist.
  triageLabel:
    | "fact_check_worthy"
    | "fact_non_check_worthy"
    | "opinion_or_subjective"
    | "unclear";
  thesisDirectness: "high" | "medium" | "low";
  expectedEvidenceYield: "high" | "medium" | "low";
  coversDistinctRelevantDimension: boolean;
  redundancyWithClaimIds: string[];
  recommendationRationale: string;
}

export interface ClaimSelectionRecommendation {
  rankedClaimIds: string[];
  recommendedClaimIds: string[]; // max 3
  assessments: ClaimSelectionRecommendationAssessment[];
  rationale: string;
}
```

Model tier: `context_refinement`.

Execution rules:

- use one structured LLM call over the whole candidate set so the model can reason about redundancy and coverage jointly
- keep routing details aligned with [2026-04-22_Check_Worthiness_Recommendation_Design.md](2026-04-22_Check_Worthiness_Recommendation_Design.md); if the configured `context_refinement` route is not strong enough for this joint reasoning task, promote it before rollout
- no deterministic keyword/regex/score fusion is allowed for semantic selection logic
- no fallback that silently substitutes the extracted `checkWorthiness` field if the recommendation call fails; draft preparation should fail cleanly instead

The prompt must first triage every candidate claim, then rank within that triage using the generic criteria already approved in the handovers:

- directness to the thesis
- independent check-worthiness
- expected evidence yield
- coverage of distinct relevant dimensions
- non-redundancy

Recommendation policy:

- `recommendedClaimIds` should normally be drawn from `fact_check_worthy` claims only
- `unclear` claims may be recommended only when they are thesis-direct and needed to preserve material coverage of the input
- `fact_non_check_worthy` and `opinion_or_subjective` claims remain user-selectable in the UI but are not auto-recommended in v1
- `opinion_or_subjective` is a dominant treatment label for v1 UI and ranking, not proof that the claim contains zero factual material

This keeps the recommendation logic aligned with the ZHAW evidence without prematurely committing v1 to a separate supervised classifier. If we later build a labeled evaluation set for this exact selection problem, we can reconsider whether a smaller specialized model should replace or front-run the LLM triage step.

### 8.3 Reuse runner concurrency without over-generalizing the queue

Draft preparation must share the same concurrency budget, watchdog discipline, and provider-pause behavior as real jobs, but v1 does not need a full queue-generalization refactor up front.

Add a new internal route:

- [apps/web/src/app/api/internal/run-claim-selection-draft/route.ts](../../apps/web/src/app/api/internal/run-claim-selection-draft/route.ts)

The new background task should:

1. load the draft from the API
2. run shared Stage 1 preparation
3. run the recommendation call
4. persist the prepared snapshot and recommendation output
5. either:
   - leave the draft in `AWAITING_CLAIM_SELECTION`, or
   - auto-create the job in automatic mode

Implementation constraint:

- reuse the same running-slot accounting and watchdog behavior as `internal-runner-queue.ts`
- a sibling `draftQueue` inside the same module is acceptable for v1
- a fully unified discriminated-union queue is optional and should only be introduced if it materially simplifies the code

The hard requirement is shared concurrency control, not a specific queue type shape.

### 8.4 Prepared-job execution path

Extend `runClaimBoundaryAnalysis(...)` so the runner can skip Stage 1 when a job already carries `PreparedStage1Json`.

Recommended signature change:

```ts
runClaimBoundaryAnalysis({
  jobId,
  inputType,
  inputValue,
  preparedStage1,
  claimSelection,
  onEvent,
})
```

Execution rule:

- if `preparedStage1` is absent: current cold-start behavior
- if `preparedStage1` is present:
  - load configs once using the same startup path as cold-start analysis
  - hydrate the prepared snapshot (`resolvedInputText` + `preparedUnderstanding`)
  - initialize a fresh `CBResearchState` with:
    - `originalInput = preparedStage1.resolvedInputText`
    - `inputType = inputType`
    - `pipelineStartMs = Date.now()`
    - empty Stage 2+ accumulators (`evidenceItems`, `sources`, `searchQueries`, ledgers, iteration counters, boundaries, warnings)
  - set `state.understanding = preparedStage1.preparedUnderstanding`
  - derive `state.languageIntent` from `preparedStage1.preparedUnderstanding.detectedLanguage` using the same logic the cold-start path currently applies after Stage 1
  - filter `atomicClaims` to `selectedClaimIds`
  - preserve claim-selection provenance separately in `claimSelection`
  - do **not** re-fetch the URL or re-run input normalization; `resolvedInputText` is the prepared-job source of truth
  - skip Stage 1 and start at Stage 2 research

The first emitted progress event for prepared jobs should jump directly to the Stage 2 watermark instead of replaying Stage 1 progress messages.

## 9. UI integration

### 9.1 Analyze page

Update [apps/web/src/app/analyze/page.tsx](../../apps/web/src/app/analyze/page.tsx):

- replace direct `POST /api/fh/analyze` submit with draft creation
- add a compact setting or toggle for `Auto-continue with recommended claims`
- persist the setting in `localStorage` as `fh_claim_selection_mode`

The existing client-side input parsing helpers (`isUrl`, `normalizeUrl`, `getInputType`) should be extracted into a shared client utility so `Other` uses the same parsing behavior as the initial submission.

### 9.2 New selection page

Add:

- [apps/web/src/app/analyze/select/[draftId]/page.tsx](../../apps/web/src/app/analyze/select/[draftId]/page.tsx)
- a local `ClaimSelectionPanel` component under that route

Behavior:

- poll the draft route until `AWAITING_CLAIM_SELECTION` or `COMPLETED`
- render the exact candidate claims in recommendation order
- preselect the recommended claims
- enforce max-5 both client-side and server-side
- treat `Other` as mutually exclusive with claim selection
- in automatic mode, show a lightweight waiting page and redirect once `finalJobId` is available

Draft preparation can use polling rather than SSE because the draft is short-lived and pre-job. This avoids entangling the existing jobs-page event stream logic.

### 9.3 Job page audit panel

Add a small audit panel on [apps/web/src/app/jobs/[id]/page.tsx](../../apps/web/src/app/jobs/[id]/page.tsx) that renders when `resultJson.claimSelection` is present.

Show:

- mode
- restarted via `Other`
- recommended claims
- selected claims
- unselected candidate claims

Do not mix this metadata into the primary verdict headline, aggregate score, or claim verdict cards.

## 10. Validation parity with the current `/analyze` flow

The handovers explicitly require `Other` to follow the same parsing and validation rules as the current submit flow.

Concrete refactor:

1. Extract server-side validation from `AnalyzeController.ValidateRequest(...)` into a shared helper, for example `AnalyzeInputValidator.Validate(...)`.
2. Use that helper in both:
   - `AnalyzeController`
   - `ClaimSelectionDraftsController`
3. Use the same input-type values and max-length rules already enforced today.
4. On `Other` restart, recompute `activeInputType` from the replacement input and persist it before draft preparation begins.

This ensures that initial submit and `Other` restart cannot drift.

## 11. Implementation checklist by file surface

### 11.1 API

- [apps/api/Data/Entities.cs](../../apps/api/Data/Entities.cs)
- [apps/api/Data/FhDbContext.cs](../../apps/api/Data/FhDbContext.cs)
- new manual migration under `apps/api/migrations/` for `ClaimSelectionDraftEntity` plus the new `JobEntity` columns; follow the repo's existing handwritten migration convention rather than assuming `dotnet ef migrations add`
- [apps/api/Controllers/AnalyzeController.cs](../../apps/api/Controllers/AnalyzeController.cs) - extract shared validation helper only
- new `ClaimSelectionDraftsController.cs`
- new `InternalClaimSelectionDraftsController.cs`
- new `ClaimSelectionDraftService.cs` - create/get/confirm/restart/cancel/retry, lazy expiry enforcement, and draft-time invite-slot claiming
- [apps/api/Services/JobService.cs](../../apps/api/Services/JobService.cs) - create jobs from confirmed drafts and store claim-selection metadata
- [apps/api/Services/RunnerClient.cs](../../apps/api/Services/RunnerClient.cs) - add `TriggerDraftPreparationAsync(...)` parallel to `TriggerRunnerAsync(...)`

### 11.2 Web app and runner

- [apps/web/src/app/analyze/page.tsx](../../apps/web/src/app/analyze/page.tsx)
- new `apps/web/src/app/analyze/select/[draftId]/page.tsx`
- new `apps/web/src/app/api/fh/claim-selection-drafts/**/*`
- new `apps/web/src/app/api/internal/run-claim-selection-draft/route.ts`
- [apps/web/src/lib/internal-runner-queue.ts](../../apps/web/src/lib/internal-runner-queue.ts)
- [apps/web/src/lib/analyzer/types.ts](../../apps/web/src/lib/analyzer/types.ts)
- [apps/web/src/lib/analyzer/claimboundary-pipeline.ts](../../apps/web/src/lib/analyzer/claimboundary-pipeline.ts)
- new `apps/web/src/lib/analyzer/claim-selection-recommendation.ts`
- shared `prepareStage1Snapshot(...)` helper extracted from the current cold-start path, including URL pre-fetch normalization and contract-failure parity
- [apps/web/src/app/jobs/[id]/page.tsx](../../apps/web/src/app/jobs/[id]/page.tsx) for the audit panel

## 12. Test plan

### 12.1 Backend/API

- create draft validates the same limits as `/v1/analyze`
- draft creation claims invite slot once
- invite hourly limits are enforced against draft creation, not only confirmed jobs
- `Other` restart does not claim an additional invite slot
- failed draft retry does not claim an additional invite slot before expiry
- confirm rejects more than 5 selected IDs
- confirm rejects IDs not present in `preparedStage1.preparedUnderstanding.atomicClaims`
- draft token required for non-admin draft access
- expired drafts reject confirm, restart, and retry
- expiry is enforced lazily on read/mutation without a required background sweep
- confirmed job stores `PreparedStage1Json` and `ClaimSelectionJson`
- if `FinalJobId` is present, draft reads treat the draft as effectively complete even if a later status update lagged

### 12.2 Runner/pipeline

- prepared jobs skip Stage 1 and begin at Stage 2
- shared preparation helper reproduces cold-start Stage 1 candidate sets, including URL pre-fetch behavior and contract-failure early termination
- prepared jobs use only `selectedClaimIds` for downstream research and verdicts
- prepared jobs use persisted `resolvedInputText`; they do not re-fetch URL content
- prepared jobs reconstruct `CBResearchState` and `languageIntent` without needing a cold-start Stage 1 run
- recommendation failure yields draft `FAILED` without deterministic fallback
- recommendation runs as one batched call over the full final candidate set
- recommendation persists its full audit snapshot into `ClaimSelectionJson` when the final job is created
- claims labeled `fact_non_check_worthy` or `opinion_or_subjective` are not auto-recommended
- automatic mode creates the same job metadata that interactive confirm would create
- the draft layer has exactly one authoritative payload for prepared Stage 1 data

### 12.3 UI

- interactive default routes through the draft page
- automatic mode routes through the draft page and auto-redirects to the job
- `Other` clears existing selections and disables the checklist
- `Other` restart can switch between text and URL input and persists the recomputed active input type
- max-5 selection limit is enforced in the UI
- job page audit panel renders persisted selection provenance when present

### 12.4 Acceptance anchors

Use the already-approved examples from the handovers:

- Iran/WMD job: candidate set must remain 22 claims
- Bolsonaro job: candidate set must remain 3 claims
- Bundesrat job: candidate set must remain 1 claim
- the same three anchors must produce identical candidate sets through the draft-preparation path and the cold-start path

### 12.5 Recommendation-specific validation

Use only Captain-approved analysis inputs already listed in [AGENTS.md](../../AGENTS.md):

- the two approved Bundesrat variants should preserve the same thesis-direct recommendation shape despite wording differences
- the English and Portuguese Bolsonaro inputs should keep materially similar recommendation priorities across languages
- recommendation output must show an explicit triage label for every candidate claim
- multilingual validation should confirm that the selector is not implicitly relying on English-only wording patterns

Rollout gate:

- the provisional v1 triage-label schema is not considered stable until the approved multilingual validation cases above pass
- if those multilingual checks fail, the schema stays provisional and must be revised before broader rollout

## 13. Rollout sequence

The backlog now tracks this area as:

- `ACS-1` = the draft/prepared-job Atomic Claim Selection foundation over the current flat final `atomicClaims`
- `ACS-CW-1` = the in-flow post-Gate-1 recommendation layer from section 8.2
- `TOPPROP-1` = the later `topLevelProposition` detection-only track outside ACS semantics

This spec remains the canonical design document for `ACS-1` plus `ACS-CW-1`. `TOPPROP-1` is intentionally out of scope here.

Implement in this order inside the ACS track:

1. API draft entity, service, migration, and internal draft runner trigger
2. shared Stage 1 preparation helper and prepared-job execution path
3. draft/job persistence surfaces and selection-confirmation flow
4. recommendation module from section 8.2 inside that same draft/prepared-job architecture
5. analyze page and selection page UI
6. job-page claim-selection audit panel

This order keeps the system shippable behind a flag, matches the clarified “foundation first, recommendation second” sequence, and avoids coupling UI work to unfinished runner semantics.

Staging note:

- if implementation lands in multiple engineering slices, foundation work may land first behind a flag
- the recommendation layer is still part of the same ACS track, not a separate product contract
- full user-facing automatic-mode behavior requires both the ACS foundation and the in-flow recommendation layer

Optional narrow first slice:

- if the team needs an earlier incremental delivery, the only acceptable narrow slice is **automatic-only ACS inside the same draft/prepared-job architecture**
- that slice may skip the chooser UI temporarily, but it must still persist recommendation output through the ACS draft/job contracts
- it is **not** a separate standalone Check-worthiness service rollout

## 14. Summary

The implementation-ready v1 is:

- a new pre-job draft/intake subsystem
- one shared Stage 1 preparation path used by both draft prep and cold-start analysis
- one batched post-Gate-1 LLM triage/recommendation step that treats the current extracted `checkWorthiness` field as advisory, not authoritative
- in `automatic` mode, that recommendation step becomes the effective post-Stage-1 selection filter for downstream analysis
- a provisional v1 primary-label contract for recommendation, explicitly marked as a FactHarbor product simplification rather than a direct ZHAW taxonomy transfer
- the canonical design anchor for backlog slices `ACS-1` and `ACS-CW-1`, with `TOPPROP-1` explicitly deferred
- interactive default with browser-local automatic override
- `Other` restart on the same draft before claim extraction
- one authoritative draft payload plus minimal job-side selection metadata
- prepared real jobs that start at Stage 2 and carry claim-selection provenance as metadata

That design satisfies the handovers without reopening the existing live-job pause/resume model.
