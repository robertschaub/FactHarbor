# Remaining Unification Architecture Assessment

**Date**: 2026-04-28  
**Role**: Lead Architect  
**Status**: Architecture assessment complete; implementation not started  
**Decision**: **MODIFY** - proceed with targeted contract and governance unification only. Do not broadly consolidate pipeline stages or authorities.

---

## Executive Summary

The original AtomicClaim extraction and check-worthiness unification request is now mostly covered by recent source changes and documentation. The accepted architecture is:

- Stage 1 remains the authority for final `AtomicClaim` candidate validity.
- ACS-CW remains the post-Gate-1 recommendation authority over those candidates.
- Budget-aware ACS metadata stays inside the existing ACS recommendation path.
- Supported validation automation now goes through the ACS automatic draft path.
- Research-waste and selected-claim Stage 2 telemetry now exist.

What remains is not another large ACS/check-worthiness merge. The remaining benefit is narrower: align contracts, names, provenance, entrypoint governance, prompt governance, and observability so the new architecture is not undermined by drift between adjacent surfaces.

The recommended plan is **contract-first unification**:

1. Fix `AtomicClaim.checkWorthiness` schema/type/UI drift.
2. Standardize ACS budget/deferred metadata inside the existing recommendation contract.
3. Define selected-claim Stage 2 execution coverage as a visible quality contract.
4. Normalize runtime, prepared snapshot, validation, prompt/config, and dirty-runtime provenance.
5. Govern direct analyze endpoints versus supported validation entrypoints.
6. Finish prompt-governance unification for remaining non-ClaimBoundary prompt surfaces.
7. Define a thin observability metadata contract across draft, final-job, metrics, validation, and API surfaces.

This preserves the important separations while removing the still-dangerous ambiguity around their edges.

---

## Current-State Note

This assessment was made against the current 2026-04-28 workspace. Several documentation/status files were already modified before this task began. Those changes are treated as existing work-in-progress and were not reverted.

---

## Debate Result

The debate result was **MODIFY**.

Both sides agreed that broad unification is the wrong target. The durable decision is:

- Do not unify Stage 1 extraction, Gate 1, ACS recommendation, and check-worthiness into one analytical mechanism.
- Do standardize the contracts around their boundary.
- Treat proven drift as actionable: types, UI labels, provenance fields, entrypoint policy, prompt-governance exceptions, and observability schemas.
- Keep all semantic analytical decisions inside LLM-backed paths and UCM-managed prompts.

Confidence: **confirmed**. Advocate and Challenger converged on the same boundary: targeted cleanup and governance hardening, not runtime consolidation.

---

## What Recent Work Already Covers

### 1. ACS/check-worthiness authority split

The April 24 architecture decision is now reflected in source and docs:

- `apps/web/src/lib/analyzer/claim-selection-recommendation.ts` owns the ACS-CW recommendation contract.
- `apps/web/src/lib/analyzer/claim-extraction-stage.ts` still owns Stage 1 extraction and Gate 1 candidate validity.
- The ACS living xWiki page says ACS selects from exact Stage 1 `AtomicClaim` IDs and does not merge, split, rewrite, or reinterpret claims after Stage 1.

Covered conclusion: full Stage 1/ACS merger is not the architecture.

### 2. Budget-aware ACS remains inside the approved path

Recent source has default-off budget-aware ACS fields:

- `claimSelectionBudgetAwarenessEnabled`
- `claimSelectionBudgetFitMode`
- `claimSelectionMinRecommendedClaims`
- `deferredClaimIds`
- `budgetFitRationale`
- per-assessment `budgetTreatment`

These are implemented inside the existing recommendation path, not as a second selector. `explain_only` remains shadow metadata; `allow_fewer_recommendations` is the only mode that can recommend fewer than cap with budget rationale and deferred-claim metadata.

Covered conclusion: budget fit is metadata/behavior on the existing ACS recommendation path, not a new authority.

### 3. Validation path thin waist

Supported validation automation now uses the shared ACS automatic draft client:

- `apps/web/scripts/automatic-claim-selection.js`
- `scripts/validation/extract-validation-summary.js`
- `scripts/run-validation-matrix.js`
- `apps/web/scripts/baseline-runner.js`

The validation summary now emits schema v2 metadata such as prepared/ranked/recommended/selected/deferred IDs and `submissionPath: "acs-automatic-draft"`.

Covered conclusion: supported validation should no longer add direct-full rerun paths.

### 4. Research-waste and selected-claim telemetry

Recent source adds `analysisObservability.acsResearchWaste`, including:

- selected versus dropped preparation counts;
- preliminary work attribution;
- Stage 1 to Stage 2 URL overlap;
- selected-claim research metrics;
- contradiction reachability.

Covered conclusion: the system now has the structural telemetry needed to reason about broad-input ACS waste and selected-claim research distribution.

### 5. Source artifact reuse is not the next lever

The SVP Slice 3 metrics review found zero exact Stage 1 to Stage 2 URL overlap for that workload. Source artifact reuse is therefore not justified by current evidence.

Covered conclusion: do not pursue source artifact reuse as near-term unification.

### 6. ClaimBoundary prompt split and runtime telemetry

The ClaimBoundary prompt source layout now has a manifest-backed split file layout while retaining one composite UCM prompt blob/hash. Runtime telemetry now records prompt section and payload-size fields for selected call paths.

Covered conclusion: ClaimBoundary prompt-file maintainability and some runtime cache boundaries are materially improved.

---

## What Is Not Yet Covered

### Gap 1 - Check-worthiness contract and labeling drift

Source facts:

- `Pass2AtomicClaimSchema` accepts `checkWorthiness: "high" | "medium" | "low"`.
- The source is partially widened already: the older Stage 1-facing `ClaimUnderstanding.subClaims[].checkWorthiness` surface in `apps/web/src/lib/analyzer/types.ts` accepts `"high" | "medium" | "low"`.
- The remaining narrow live CB contract is `AtomicClaim.checkWorthiness` in `apps/web/src/lib/analyzer/types.ts`, which still accepts only `"high" | "medium"`.
- The selection UI displays `Check-worthiness: ...` beside ACS recommendation fields.
- The HTML report also displays `Check-worthiness: ...`.

Problem:

The same label now appears near two different concepts:

- Stage 1 extraction-time advisory metadata.
- ACS recommendation/ranking authority.

This keeps the original ambiguity alive even though the architecture decision is clear.

Recommended unification:

- Make the remaining narrow `AtomicClaim.checkWorthiness` contract match the actual Stage 1 schema, or intentionally narrow the schema with explicit prompt approval. The least invasive path is to widen `AtomicClaim.checkWorthiness` to include `low` and document it as extraction-time advisory metadata.
- Rename display labels from `Check-worthiness` to a clearer Stage 1 label, such as `Stage 1 priority hint` or `Extraction priority hint`.
- Keep ACS recommendation labels distinct: `Recommendation`, `Triage`, `Directness`, `Evidence yield`, and `Budget treatment`.
- Do not use this field as a selector fallback.

Priority: **highest**, because the drift is concrete and low-cost to fix.

### Gap 2 - ACS budget/deferred metadata contract is implemented but still young

Source facts:

- Budget-aware fields exist in TypeScript, prompt section, config defaults, draft state, API parsing, admin detail UI, and validation summaries.
- Defaults remain off.
- Automatic mode can preserve budget/deferred metadata, but current product posture is back to interactive after the SVP canary.

Problem:

The metadata exists across several surfaces, but its ownership must remain clear:

- `claimSelectionCap` is an upper bound, not a target.
- `deferredClaimIds` means explicit budget-deferred claims only, not ordinary unselected claims.
- `budgetTreatment` must not become a second selector.
- Manual users may override deferred choices within the cap.

Recommended unification:

- Treat budget/deferred metadata as one versioned ACS recommendation sub-contract.
- Keep field names and semantics identical across TypeScript, persisted draft JSON, `ClaimSelectionJson`, API/admin views, and validation schema v2.
- Add focused contract tests when metadata crosses a new surface.
- Keep default-off until Captain-approved validation proves the behavior.

Priority: **high**, but do not promote default behavior from structure alone.

### Gap 3 - Selected-claim Stage 2 execution coverage

Source facts:

- Current status records a live SVP ACS canary where a selected claim received zero targeted Stage 2 iterations while contradiction ran.
- `analysisObservability.acsResearchWaste.selectedClaimResearch` can now expose selected-claim iteration/evidence counts.
- `research-orchestrator.ts` has per-claim iteration floors and contradiction admission, but the observed issue remains active.

Problem:

ACS can select a set of claims, but the downstream research stage can still fail to give every selected claim targeted research coverage under budget pressure. That is not an ACS recommendation bug by itself, and it is not a validation-tooling bug. It is a cross-stage execution contract gap.

Recommended unification:

Define a thin **SelectedClaimResearchCoverage** contract:

- Every selected `AtomicClaim` must have an explicit coverage state in final observability:
  - targeted iterations;
  - query count;
  - fetch attempt count;
  - evidence item count;
  - sufficiency state;
  - reason if zero targeted iterations.
- Validation summaries must surface zero-iteration selected claims.
- Warning materiality must decide when zero targeted iterations become user-visible quality degradation.
- ACS budget-aware selection may use structural budget context only through the LLM recommendation path, not deterministic post-filtering.

This contract should explain the condition before trying to solve it with selector behavior.

Priority: **high**, because it is an active quality finding.

### Gap 4 - Runtime and validation provenance

Source facts:

- `PreparedStage1Provenance` now records source input type, resolved input hash, executed web hash, prompt hash, pipeline/search/calc hashes, and selection cap.
- The recent provenance fix narrowed the pipeline config hash for prepared Stage 1 so already-persisted ACS orchestration knobs do not invalidate a draft.
- Backlog still lists runtime provenance drift as open.
- Validation summaries now include some job/draft/provenance fields, but live jobs can still be dirty or later-runtime.

Problem:

Prepared snapshots, final jobs, validation summaries, prompt/config UCM state, dirty-runtime suffixes, and historical direct references still use overlapping but not fully unified provenance concepts.

Recommended unification:

Define one **AnalysisRunProvenance** vocabulary with stage-specific subsets:

- input/source provenance;
- prepared Stage 1 provenance;
- final execution provenance;
- prompt composite hash and relevant section/source layout metadata;
- pipeline/search/calc/SR config hashes;
- selection provenance: mode, cap, recommended IDs, selected IDs, deferred IDs;
- runtime git state, dirty suffix, service refresh/reseed marker when available;
- validation submission path.

The goal is not to freeze all config forever. The goal is to make drift auditable and consistently classified.

Priority: **high** because it affects trust in validation evidence.

### Gap 5 - Direct analyze endpoint governance

Source facts:

- Supported validation scripts use the ACS automatic draft thin waist.
- Direct `/v1/analyze` and `/api/fh/analyze` still exist.
- Several direct scripts are labeled as quarantined validation tooling, but manual execution remains possible.

Problem:

The repo now has one supported validation path but more than one analysis entrypoint. That is acceptable if the policy is explicit, but risky if direct jobs are later treated as equivalent validation evidence.

Recommended unification:

- Add or require a `submissionPath` / `entrypointKind` concept for all job creation paths.
- Keep direct endpoints available only under explicit product/API semantics or documented forensic use.
- Prevent supported validation output from silently mixing ACS automatic draft jobs with direct jobs.
- Do not add a direct-full validation rerun mode unless Captain explicitly approves a new architecture.

Priority: **medium-high**.

### Gap 6 - Prompt governance outside ClaimBoundary

Source facts:

- ClaimBoundary prompt source layout and runtime telemetry have improved.
- `PROMPT-ARCH-1` remains open:
  - source-reliability core evaluation still bypasses the file/UCM prompt path;
  - inverse-claim verification reads a micro-prompt directly from disk;
  - `text-analysis` prompt profile/docs are stale or inconsistent.

Problem:

ClaimBoundary is now closer to the desired prompt-governance model, but other prompt-adjacent paths still do not share the same source-of-truth, provenance, and admin-editability story.

Recommended unification:

- Create a prompt-surface registry that classifies each prompt path as:
  - UCM-managed runtime prompt;
  - manifest-backed composite prompt;
  - local calibration-only helper;
  - intentional exception.
- Migrate SR primary/refinement prompts into the prompt loader/UCM path, or explicitly document them as code-built exceptions.
- Move inverse verification into a real prompt profile/section, or explicitly mark it disk-only calibration tooling.
- Remove or formalize stale `text-analysis` profile references.
- Do not change prompt wording as part of this governance cleanup unless explicitly approved.

Priority: **medium-high** because prompt governance affects provenance and analysis behavior control.

### Gap 7 - Observability contract fragmentation

Source facts:

Observability now spans:

- `ClaimSelectionDraftObservability`;
- final `analysisObservability.acsResearchWaste`;
- `AnalysisMetrics.llmCalls` prompt-runtime fields;
- validation schema v2 summaries;
- C# JSON parsing for draft/job metadata;
- warning-display registration and report quality signals.

Problem:

The surfaces are useful but not yet one governed contract. Without a shared vocabulary, future agents can add near-duplicate fields or infer different meanings from similar metrics.

Recommended unification:

Define a thin **AnalysisObservability Contract**:

- versioned top-level namespace for final result observability;
- field ownership by producer;
- stability class: stable, experimental, admin-only, validation-only;
- privacy/storage boundary: no prompt text, source text, fetched HTML, or raw LLM payloads unless a specific debug path allows it;
- cross-links to `AnalysisMetrics` rather than copying all call-level metrics into result JSON;
- API DTO/read-model expectations for C# parsing.

This should be a schema/vocabulary contract, not a new metrics subsystem.

Priority: **medium**.

---

## Options Considered

### Option A - Do nothing beyond current implementation

Benefits:

- No immediate implementation risk.
- Avoids disturbing the current ACS path while validation is active.

Costs:

- Leaves known check-worthiness type/UI drift.
- Leaves validation/provenance ambiguity.
- Leaves prompt-governance exceptions unresolved.
- Increases chance of future agents adding parallel fields or mechanisms.

Assessment: acceptable only as a temporary pause, not a target architecture.

### Option B - Broad pipeline consolidation

Description:

Merge Stage 1 extraction, ACS recommendation, budget fit, validation, and selected-claim execution into one larger orchestrator or selector.

Benefits:

- Appears simpler at a diagram level.

Costs:

- Reopens the rejected Stage 1/ACS authority merger.
- Risks turning budget metadata into selection logic.
- Risks deterministic or hidden claim filtering.
- Would obscure the Stage 2 distribution problem.
- Would likely require prompt behavior changes and live validation.

Assessment: reject.

### Option C - Contract-first unification

Description:

Keep existing authorities and modules, but standardize the contracts at their edges:

- field names;
- type contracts;
- provenance fields;
- validation entrypoint metadata;
- observability schema;
- prompt-governance classification.

Benefits:

- Fixes actual drift without adding a second mechanism.
- Preserves the ACS architecture decision.
- Supports validation trust.
- Makes later behavior work safer.
- Can be phased with low-risk no-behavior slices first.

Costs:

- Requires discipline to avoid broad refactors.
- Some changes cross TypeScript/C#/docs/test surfaces.
- Does not by itself fix selected-claim zero-iteration behavior.

Assessment: preferred.

### Option D - Extract shared services / shared DTO library

Description:

Introduce shared generated schemas or a cross-language contract package for draft state, `ClaimSelectionJson`, observability, and provenance.

Benefits:

- Could reduce TypeScript/C# JSON drift.
- Could improve validation tooling consistency.

Costs:

- Higher implementation footprint.
- Premature if field ownership is not first defined.
- Can become a broad platform project while active quality issues remain open.

Assessment: defer until Option C defines stable contracts and drift persists.

---

## Recommended Roadmap

### Phase 0 - This Decision Record

Status: this document.

Purpose:

- Close the loop on what recent work already covered.
- Define the remaining unification scope.
- Prevent over-unification while current ACS validation work continues.

### Phase 1a - No-Behavior Check-Worthiness Cleanup

Scope:

- Fix or explicitly retire the remaining narrow `AtomicClaim.checkWorthiness` type drift.
- Rename UI/report labels so extraction-time advisory metadata is not presented as ACS recommendation authority.

Verification:

- Focused type/UI tests where applicable.
- `npm -w apps/web run build`.
- `git diff --check`.

Prompt wording changes are out of scope unless explicitly approved.

### Phase 1b - ACS-CW Attribution and Prompt-Governance Inventory

Scope:

- Consider a dedicated ACS-CW metric/task label for attribution, without changing model selection.
- Inventory inline LLM instruction text in ACS-CW and decide whether it should move into the prompt section under explicit approval.
- Keep this as inventory or no-behavior attribution work. Any prompt wording move belongs under prompt governance and needs explicit approval.

Verification:

- Focused metrics tests if task attribution changes.
- Documentation/source inventory if no code changes.
- `git diff --check`.

### Phase 2 - Selected-Claim Research Coverage Contract

Scope:

- Make zero-iteration selected claims a first-class structural condition in `analysisObservability`.
- Ensure validation schema v2 reads and reports selected-claim coverage consistently.
- Decide warning severity using the existing warning materiality policy.
- Keep Stage 2 investigation separate from ACS recommendation authority.

Verification:

- Unit tests for selected-claim coverage summaries.
- Focused Stage 2 tests for zero targeted iteration reporting.
- No live jobs unless committed/runtime-refreshed and Captain-approved.

### Phase 3 - Provenance and Entrypoint Governance

Scope:

- Define shared provenance vocabulary for prepared Stage 1, final execution, validation summaries, prompt/config hashes, and submission paths.
- Add or standardize `submissionPath`/`entrypointKind` for direct analyze routes if not already present.
- Keep quarantined direct scripts out of supported validation.
- Include C# API/read-model contract coverage for `ClaimSelectionJson`, draft-state parsing, and admin DTO exposure so TypeScript/C# drift is tested at the boundaries where metadata is consumed.

Verification:

- API/Web tests for provenance fields.
- Validation summary tests.

### Phase 4 - Prompt Governance Cleanup

Scope:

- Address `PROMPT-ARCH-1` without prompt wording changes:
  - SR core prompt source-of-truth decision;
  - inverse micro-prompt UCM/disk-only decision;
  - `text-analysis` profile formalization or removal;
  - docs/runtime alignment.

Verification:

- Prompt loader/config tests.
- Prompt seeding tests.
- Documentation diff check.

### Phase 5 - Observability Contract

Scope:

- Define versioned field ownership for:
  - draft observability;
  - `analysisObservability.acsResearchWaste`;
  - prompt-runtime `AnalysisMetrics`;
  - validation schema v2;
  - API admin DTO parsing.
- Document which fields are stable, experimental, admin-only, or validation-only.
- Avoid copying raw prompt/source/LLM payloads into result JSON.
- Keep generated/shared DTOs deferred for now, but add focused TypeScript/C# fixture tests for stable observability and provenance fields before considering a shared DTO package.

Verification:

- Schema/fixture tests.
- Validation summary compatibility tests.

---

## Risk Analysis

| Risk | Impact | Mitigation |
|---|---:|---|
| Stage 1 and ACS authorities blur again | High | Keep full merge explicitly rejected; only contract edges are in scope. |
| Budget metadata becomes hidden selection logic | High | Keep all select/defer decisions inside existing ACS LLM recommendation and gated UCM mode. |
| `checkWorthiness` remains ambiguous | Medium | Fix type drift and relabel Stage 1 signal as advisory. |
| Prompt governance cleanup changes behavior accidentally | High | Separate governance/provenance changes from wording changes; require approval for wording. |
| Observability work becomes a new subsystem | Medium | Define vocabulary/ownership only; keep producers local. |
| Direct endpoint jobs pollute validation evidence | Medium | Standardize `submissionPath`/entrypoint metadata and keep supported validation path narrow. |
| Provenance gaps reduce trust in live runs | High | Normalize prepared/final/runtime/config/prompt provenance fields. |
| Source reuse gets revived prematurely | Medium | Keep source artifact reuse stopped until new overlap evidence and safety design exist. |
| Stage 2 zero-iteration selected claims are misclassified | High | Treat as pipeline-quality finding, not ACS tooling failure or evidence scarcity. |

---

## Opportunity Analysis

| Opportunity | Value | Capture path |
|---|---:|---|
| Clearer user/admin semantics | High | Relabel Stage 1 advisory field and ACS recommendation metadata. |
| Safer future ACS changes | High | Version budget/deferred metadata and keep it on the existing path. |
| More trustworthy validation | High | Normalize provenance and entrypoint metadata. |
| Faster diagnosis of broad-input failures | High | Surface selected-claim coverage and contradiction reachability consistently. |
| Lower prompt governance risk | Medium | Finish prompt-source/provenance consistency without wording changes. |
| Less duplicate telemetry | Medium | Define observability field ownership and compatibility rules. |
| Lower cross-language schema drift | Medium | Consider generated/validated DTOs only after contracts stabilize. |

---

## Explicit Non-Goals

- No Stage 1/ACS/check-worthiness merger.
- No second selector.
- No deterministic semantic ranking, filtering, check-worthiness, or budget-fit rules.
- No source artifact reuse implementation.
- No prompt wording edits without explicit human approval.
- No direct-full validation rerun path.
- No attempt to solve selected-claim Stage 2 distribution by hiding selected claims after ACS.

---

## Backlog Mapping

This assessment aligns with existing active backlog items:

- `MON-ACS-DIST`: selected-claim Stage 2 research distribution.
- `MON-STG1-LAT`: Stage 1 time-to-selection.
- `MON-EVID-1`: Stage 2 evidence lifecycle/provenance invariants.
- `MON-PROV-1`: runtime/live validation provenance drift.
- `PROMPT-ARCH-1`: prompt-system architecture cleanup.
- `ACS-CW-1`: done/monitor, with remaining contract drift handled here.

No new high-level product track is required. The recommendation is to use this document to sequence small cleanup/design slices inside the existing monitor and prompt-governance tracks.

---

## Final Recommendation

The remaining unification should be **targeted, contract-first, and governance-oriented**.

The first implementation slice should be Phase 1a only: no prompt, model-routing, or pipeline behavior changes. It should fix the concrete `checkWorthiness` type/display drift and make the advisory-vs-recommendation authority distinction impossible to miss.

The next slices should focus on selected-claim research coverage, provenance, entrypoint governance, prompt-governance exceptions, and observability field ownership. These are the areas where the current architecture still benefits from unification without recreating the larger coupling that recent ACS work deliberately avoided.
