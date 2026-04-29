# Remaining Unification Implementation Status

**Date**: 2026-04-29  
**Role**: Senior Developer / Senior Architect execution  
**Status**: Contract-first implementation completed through observability/provenance/prompt-governance documentation  
**Live verification jobs used**: 0 of 8  

---

## Executive Summary

The implemented work followed the accepted architecture: keep Stage 1 as the `AtomicClaim` validity authority and keep ACS-CW as the post-Gate-1 recommendation authority. The work did not merge pipeline authorities, add a second selector, add deterministic semantic ranking, change prompt wording, or promote budget-aware ACS defaults.

The implementation focused on the remaining unification value at the edges:

1. Check-worthiness type and label drift.
2. Selected-claim Stage 2 coverage visibility.
3. ACS budget/deferred validation observability.
4. Submission path and run provenance attribution.
5. Prompt-surface governance and exception inventory.
6. Updated architecture documentation.

The main remaining gap is behavioral, not structural: selected claims can still receive zero targeted Stage 2 main iterations under some runs. That condition is now visible in final observability and validation summaries; it is not yet prevented.

---

## Implemented Slices

### 1. Check-Worthiness Contract Cleanup

Commit: `46807bdf fix: align check-worthiness contract and labels`

Implemented:

- Widened the remaining narrow `AtomicClaim.checkWorthiness` TypeScript contract to include `low`.
- Relabeled live UI/report surfaces from `Check-worthiness` to `Stage 1 extraction hint`.
- Kept the field advisory and extraction-time only.

Decision:

- Do not use `AtomicClaim.checkWorthiness` as selector fallback or ACS authority.

### 2. Selected-Claim Research Coverage

Commit: `59e1c806 feat: surface ACS research coverage telemetry`

Implemented:

- Added `SelectedClaimResearchCoverage`.
- Populated coverage from `claimAcquisitionLedger`.
- Counted targeted main iterations separately from total iterations and contradiction/refinement/contrarian iteration types.
- Preserved legacy `selectedClaimResearch` for compatibility.
- Exposed validation summary fields:
  - `selectedClaimResearchCoverage`
  - `zeroTargetedSelectedClaimCount`
  - `zeroTargetedSelectedClaimIds`
- Added validation comparator visibility for zero-targeted selected claims.

Decision:

- Treat zero targeted selected-claim research as structural telemetry first.
- Do not change Stage 2 scheduling, ACS recommendation, warning severity, or verdict behavior in this slice.

### 3. ACS Budget and Task Attribution

Commit: `59e1c806 feat: surface ACS research coverage telemetry`

Implemented:

- Added `claim_selection` LLM task attribution for ACS-CW calls.
- Added validation extraction of:
  - `budgetFitRationale`
  - `budgetTreatmentCounts`
  - `budgetTreatmentByClaimId`

Decision:

- Keep ACS budget awareness UCM-gated and default-off.
- Keep `budgetTreatment` as recommendation metadata, not independent selector logic.

### 4. Submission Path and Run Provenance

Commit: `ba234200 feat: label analysis submission provenance`

Implemented:

- Added `JobEntity.SubmissionPath`.
- Set direct jobs to `direct-api`, retries to `retry`, and ACS automatic draft jobs to `acs-automatic-draft`.
- Added startup column creation and migration SQL.
- Exposed admin-only job detail fields for creation/execution/prompt hashes.
- Added validation summary `analysisRunProvenance` with submission path, draft/job IDs, selected Stage 1 preparation provenance, and git/prompt hashes.

Decision:

- Make supported validation attribution explicit.
- Do not block direct product/API endpoints in this slice.

### 5. Prompt-Surface Registry

Commits:

- `78013460 chore: register prompt governance surfaces`
- `423a49fd chore: classify legacy grounding prompt surface`

Implemented:

- Added `apps/web/src/lib/prompt-surface-registry.ts`.
- Registered current prompt surfaces:
  - `claimboundary`
  - `source-reliability-enrichment`
- `source-reliability-core`
- `input-policy-gate`
- `grounding-check-legacy`
- `claimboundary-pass2-inline-framing`
- `source-reliability-evidence-pack-inline`
- `inverse-claim-verification`
- Classified intentional exceptions:
  - source reliability core is code-built.
  - grounding check uses DB-only legacy `orchestrated` sections.
  - Stage 1 Pass 2 framing is inline code.
  - source-reliability evidence-pack language helper prompts are inline code.
  - inverse claim verification is a disk-only calibration helper.
- Added registry tests that lock the surface list and avoid embedded prompt text.

Decision:

- Inventory and govern prompt surfaces before migrating prompt sources.
- Do not edit prompt wording or move prompt content in this slice.

### 6. Architecture Documentation

Implemented:

- Updated Atomic Claim Selection and Validation xWiki with new validation schema, provenance fields, API/storage surfaces, and remaining follow-ups.
- Replaced stale Prompt Architecture xWiki content with a registry-based current-state page.
- This implementation status document records options, risks, opportunities, validation, and residual work.

---

## Options Chosen and Deferred

| Option | Disposition | Rationale |
|---|---|---|
| Broad Stage 1 / ACS / check-worthiness merger | Rejected | Would blur authorities and risk hidden selection behavior. |
| Contract-first unification | Chosen | Removes drift without changing analytical behavior. |
| Shared/generated DTO package | Deferred | Useful later, but premature before contracts stabilize. |
| Prompt-source migration for SR core/inverse/grounding | Deferred | Requires prompt-source governance and possibly behavior review. |
| User-visible warning for zero targeted selected claims | Deferred | Materiality/severity decision should be separate from structural telemetry. |
| Direct endpoint blocking | Deferred | Submission labeling is now available; policy enforcement is a separate product/API decision. |

---

## Risk Analysis

| Risk | Current status | Mitigation / next step |
|---|---|---|
| Stage 1 and ACS authorities blur again | Reduced | Labels and docs now distinguish Stage 1 extraction hints from ACS recommendation fields. |
| Selected claims still receive zero targeted Stage 2 main research | Still open | Now visible through `selectedClaimResearchCoverage` and validation zero-targeted fields. Requires Stage 2 behavior investigation. |
| Budget metadata becomes hidden selector logic | Reduced | Validation exposes budget treatment, but runtime behavior and defaults were unchanged. |
| Direct jobs pollute validation evidence | Reduced | Jobs now carry `SubmissionPath`; supported validation can distinguish ACS automatic draft from ACS interactive draft, direct, and retry paths. |
| Prompt governance claims remain inaccurate | Reduced | Prompt Architecture page now names UCM-backed surfaces and exceptions explicitly. |
| C# / TypeScript contract drift | Partially reduced | `SubmissionPath` and admin exposure were added; broader generated/shared DTO work remains deferred. |
| Running services use stale binaries/schema | Resolved locally | Services were restarted after the final commits; startup column creation handles existing SQLite DBs. |

---

## Opportunity Analysis

| Opportunity | Value | Captured now |
|---|---|---|
| Faster canary diagnosis | High | Zero-targeted selected claims are visible in summaries and comparisons. |
| Better validation provenance | High | Submission path and run provenance are explicit. |
| Safer future prompt governance | Medium | Prompt surfaces and exceptions are test-locked. |
| Lower ACS/check-worthiness ambiguity | High | Type and display labels now match the architecture. |
| Cleaner follow-up sequencing | Medium | Remaining work is separated into behavior, policy, and migration decisions. |

---

## Verification Performed

Passed:

- `npm -w apps/web test -- --run test/unit/lib/analyzer/research-waste-metrics.test.ts`
- `npm -w apps/web test -- --run test/unit/scripts/validation-historical-references.test.ts`
- `npm -w apps/web test -- --run test/unit/lib/analyzer/claim-selection-recommendation.test.ts`
- `npm -w apps/web test -- --run test/unit/lib/prompt-surface-registry.test.ts`
- `npm -w apps/web run build`
- `dotnet build -p:UseAppHost=false -o ..\..\test-output\api-build`
- `git diff --check`
- `.\scripts\restart-clean.ps1`
- API and Web health checks returned `200`

Noted:

- Plain `dotnet build` against the normal API output path was blocked by a running local API process holding `FactHarbor.Api.exe` / `.dll`. The alternate output build passed, and the later service restart replaced the running process.
- No live analysis jobs were submitted.

---

## Review and Debate Result

Final implementation followed the reconciled debate guidance:

- Implement selected-claim coverage first.
- Extend validation observability next.
- Add provenance and entrypoint labeling.
- Register prompt surfaces and exceptions without wording changes.
- Document the updated observability/provenance contract and residual risks.

Reviewer comments were incorporated:

- The check-worthiness drift finding was tightened to name the exact remaining narrow contract before implementation.
- Phase 1 cleanup was split from prompt/model inventory.
- The user-facing label used `Stage 1 extraction hint`, not a more ambiguous priority label.
- The prompt registry was expanded after source review found the DB-only grounding-check legacy surface.
- Final review requested changes for draft submission-path specificity, inline prompt exception coverage, and comparator prompt-hash drift. These were implemented with `acs-interactive-draft` / `acs-automatic-draft` labeling, additional registry entries, and a focused comparator test.

---

## Remaining Follow-Ups

1. Investigate and fix selected-claim Stage 2 research distribution so selected claims reliably receive targeted main research or an explicit, governed reason when they do not.
2. Decide whether zero targeted selected-claim research should become an admin-only or user-visible warning under the warning materiality policy.
3. Decide long-term prompt governance for SR core, grounding-check legacy sections, Stage 1 inline framing, SR evidence-pack inline helpers, and inverse calibration prompts.
4. Add focused C# fixture coverage for stable `ClaimSelectionJson`, draft-state, provenance, and admin DTO fields if these contracts continue to expand.
5. Decide whether direct `/v1/analyze` and `/api/fh/analyze` entrypoints need policy enforcement beyond provenance labeling.
6. Consider shared/generated DTOs only after the observability/provenance field contracts stabilize.
