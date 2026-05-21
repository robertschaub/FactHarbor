---
### 2026-04-10 | Lead Architect | Codex (GPT-5) | Report Quality Implementation Plan Rev B
**Task:** Convert the aligned April 10 architect reviews and the current implemented state into an implementation-ready plan for the next report-quality wave, then incorporate Lead Developer final-review tightenings.
**Files touched:** `Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Report_Quality_Implementation_Plan_RevB.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Treat the silent fail-open defect as fixed and move the next wave to four implementation tracks: (1) Stage-1 contract-validation hardening, (2) matrix/report-honesty repair, (3) regression coverage and validation battery, and (4) removal-first simplification. Separate proven defects from unresolved risks to avoid overstating the current implementation state.
**Open items:** No blocking design ambiguity remains for the next wave. The only remaining pre-implementation check is the explicit UI grep before PR 3 opens to confirm deprecated dominance fields are not still consumed by old-job rendering.
**Warnings:** Do not re-open a large prompt-expansion wave. The next implementation should prefer sharper contract inputs, stronger structural validation of LLM outputs, and deletion of stale surfaces over adding more overlapping rules.
**For next agent:** Use this as the implementation source of truth. The Lead Developer review has already been incorporated here; the preceding investigation and review handoffs remain evidence, not plan.
**Learnings:** No

# Purpose

This plan replaces the earlier April 10 investigation-style documents as the implementation guide for the next report-quality wave.

It is based on three aligned facts:

1. The old Stage-1 silent fail-open bug is genuinely fixed.
2. The system is still not reliable enough on proposition-preservation and still not honest enough in the matrix UI.
3. Cleanup/reduction now has to be part of implementation, not a later nice-to-have.

# Review Status

**Status:** Approved by Lead Developer with required clarifications, now incorporated.

This document is no longer an investigation note. It is a review-ready implementation plan.

What the Lead Developer should review here:

1. Whether the implementation split is technically sound and reviewable.
2. Whether the Stage-1 hardening track is the right minimum correctness scope.
3. Whether the matrix count-only redesign is the right minimum honesty fix.
4. Whether the proposed deletion scope is safe to land in the same wave.
5. Whether the test and validation bars are sufficient before coding starts.

Outcome:

- Lead Developer approved the plan directionally.
- Seven tightenings were required before implementation opens.
- Those tightenings are now incorporated below.

What is intentionally out of scope for this review:

- re-opening the already fixed silent fail-open bug
- broad Stage-2 variance redesign
- a large prompt rewrite
- Stage-5 architectural redesign

# Current State Summary

## Confirmed fixed

- Stage 1 no longer silently fail-opens when contract validation returns `false` or becomes unavailable.
- The pipeline now terminates early with `report_damaged` instead of shipping a normal success report in that state.
- The old deterministic whole-anchor substring check in Stage 1 has been removed.

## Confirmed still wrong

- The contract validator still cannot distinguish thesis-direct anchor carriers from tangential side claims because directness context is not passed in.
- The matrix still mixes count semantics and verdict semantics in the live UI.
- Live UI and HTML export still use different matrix semantics.
- `articleVerdictOverride` is still dead config.
- Deprecated dominance-era compatibility residue is still present in the public result types.

## Important unresolved risk

- The new structural provenance gate intentionally trusts the LLM on semantic relevance of quoted preservation spans. That removed old false negatives, but it leaves a real false-positive preservation risk.

This risk is not yet a newly re-proven regression in the current tree, but it is important enough to treat as active implementation scope.

# Guiding Principles

1. **Removal-first, not addition-first.**
   Every new rule or field added in this wave should delete or simplify something else.

2. **No new deterministic semantic logic.**
   If a fix needs text understanding, it must stay LLM-led. Deterministic code may only validate structure, IDs, bounds, and schema integrity.

3. **Preserve the separation between proven defects and risk reduction.**
   Do not present plausible risks as already-reproduced failures.

4. **Fix report honesty as a product issue, not only a pipeline issue.**
   The matrix work is not cosmetic. It directly affects user trust.

# Implementation Tracks

## Track 1 — Stage-1 Contract Hardening

### Goal

Make contract validation capable of enforcing what the prompt already claims:
- a thesis-direct claim must preserve the truth-condition anchor
- structurally valid but semantically weak anchor citations should not pass too easily

### Required changes

1. **Pass directness context into contract validation.**

   Update the validator payload in `claim-extraction-stage.ts` so each claim includes at least:
   - `thesisRelevance` (required)
   - `claimDirection` when present on the claim object
   - `isDimensionDecomposition` when present on the claim object

   This remains structural. The LLM still makes the semantic judgment.

2. **Tighten the prompt contract for anchor preservation.**

   In `CLAIM_CONTRACT_VALIDATION`:
   - preserve the current “direct claim must preserve the modifier” rule
   - make the directness requirement operational by referencing the provided claim metadata
   - require the cited preservation evidence to come from thesis-direct claim(s), not merely any claim

3. **Tighten the preservation-evidence contract without adding deterministic semantic checks.**

   Recommended approach:
   - keep runtime structural validation only
   - strengthen the LLM schema/prompt so preservation evidence must identify the direct claim(s) that carry the anchor-bearing proposition
   - keep ID validity and quote provenance checks in code
   - do not reintroduce anchor substring logic

   Non-negotiable constraint:
   - **No deterministic substring matching of anchor text against claim text or quotes is permitted.**
   - The current trust gap is narrowed structurally via directness context, not semantically via string matching.

4. **Make the fallback retry guidance internally consistent.**

   In `claim-extraction-stage.ts`, the validator-unavailable fallback branch still uses the older weak wording.
   Replace it with the same fusion-first guidance already used in the normal anchor-retry path.

### Required tests

1. Unit test: validator payload now includes directness context.
2. Unit test: a tangential-only anchor carrier cannot satisfy the direct-claim preservation rule.
3. Pipeline-level regression test: a known-broken final contract produces the early `report_damaged` path.
4. Regression test: coordinated distributed preservation still passes where appropriate.
5. Regression test: the validator-unavailable fallback guidance uses the same fusion-first wording as the normal anchor-retry path.

### Acceptance criteria

- No known-broken contract ships as a normal report.
- Contract validation can distinguish thesis-direct vs tangential anchor carriers.
- Coordinated-anchor false negatives remain fixed.
- The current trust gap is either narrowed in the same PR or explicitly left as a documented residual risk.

## Track 2 — Matrix / Report Honesty

### Goal

Make the matrix mean one thing, consistently, in both live UI and export.

### Recommended design

Move to a **count-only matrix** for this wave.

Reason:
- the matrix title and glossary already describe counts
- count-only semantics are easy to explain
- count-only semantics align better with the current HTML export
- this is the smallest honest fix

### Required changes

1. Remove verdict-color semantics from `CoverageMatrixDisplay` for the evidence-count matrix.
2. Delete `dominantVerdict()` and all callers from the count-matrix component.
3. Align HTML export with the same count-only semantics and legend.
4. If verdict semantics are still desired later, create a separate verdict-oriented visualization instead of mixing them into the count matrix.

### Required tests

1. UI/component test: live matrix renders count semantics only.
2. Export test: HTML report matrix uses the same semantics as live UI.
3. Snapshot or structural test: no row header styling depends on `dominantVerdict()`.

### Acceptance criteria

- A user can explain any matrix color using only evidence-count semantics.
- Live UI and export no longer diverge.
- The “red fields with no obvious reason” complaint is structurally addressed.

## Track 3 — Regression Coverage And Validation Discipline

### Goal

Stop evaluating report-quality changes on anecdotal single runs.

### Required changes

1. Add one direct regression test for the Stage-1 early damaged-report branch.
2. Add one targeted validation script or repeatable run checklist for:
   - Swiss anchored input
   - Swiss non-anchor coordinated split
   - one matrix-heavy report sample
   - one non-Swiss control family
3. Add one prompt-contract drift test that parses `claimboundary.prompt.md` frontmatter and asserts `requiredSections` matches the actual section headings.
4. Make config-drift success after dead-config removal an explicit CI-visible expectation, not only a manual checklist item.

Keep validation output focused on:
   - claim decomposition shape
   - contract-preservation result
   - article outcome
   - damaged-report rate

Clarification:

- The multi-family validation battery is a **process artifact**, not a PR deliverable. It should not block PR 2 or PR 3 review before the relevant code lands.

### Acceptance criteria

- Every future proposition-preservation change is evaluated against repeated runs, not one lucky run.
- The early damaged-report path is locked in by test.

## Track 4 — Removal-First Simplification

### Goal

Reduce code and prompt surface while the context is already loaded and understood.

### Required deletions / simplifications

1. Remove dead `articleVerdictOverride` config from:
   - `config-schemas.ts`
   - `calculation.default.json`

2. Remove deprecated dominance-era residue from:
   - `types.ts`
   - dead `AdjudicationPath.path` literals that are no longer architecturally valid

   Precondition before PR 3 opens:
   - grep `apps/web/src/app/jobs/` for `dominanceAssessment`, `dominance_adjusted`, and `unresolved_claim_narrative_adjustment`
   - if any live UI consumer still reads persisted old-job payloads using those fields, either keep the minimal backward-compat type surface for one more cycle or migrate that reader in the same PR

3. Reconcile prompt metadata drift:
   - `claimboundary.prompt.md` required-sections/frontmatter
   - prompt contract tests

   Direction of fix:
   - rename the frontmatter entry from `EXPLANATION_RUBRIC` to `EXPLANATION_QUALITY_RUBRIC`
   - do **not** rename the section heading, because runtime callers already use the actual section name

4. Update prompt docs:
   - `apps/web/prompts/README.md`
   - describe ClaimBoundary-first reality
   - document the narrower remaining `orchestrated` dependency honestly

### Optional follow-on, not blocking this wave

1. Remove the Stage-5 substring fallback for anchor weighting, or switch it to LLM-reported preserved IDs only.
2. Replace `isVerdictDirectionPlausible()` with an LLM re-validation path, keeping only structural polarity mismatch checks.

These remain important, but they are a separate semantic-cleanup wave unless capacity allows.

### Acceptance criteria

- Dead config is actually deleted, not merely documented as dead.
- Deprecated dominance compatibility surface is reduced.
- Prompt metadata and runtime stop drifting silently.

# Delivery Strategy

## Recommended PR split

### PR 1 — Stage-1 Contract Hardening

Scope:
- directness context
- prompt/schema update
- fallback-guidance consistency
- damaged-report regression test

Reason:
- highest correctness value
- smallest dependency on UI work

### PR 2 — Matrix Honesty

Scope:
- count-only matrix semantics
- live/export alignment
- matrix tests

Reason:
- highest user-trust value
- independent from Stage-1 logic

### PR 3 — Simplification

Scope:
- remove dead config
- remove deprecated dominance residue
- reconcile prompt metadata/docs

Reason:
- cleanup should be isolated so it is reviewable as deletion work, not buried inside bug fixes

## Do not combine

Do not combine matrix redesign and Stage-1 contract hardening into a single PR. They solve different problems and need different reviewers.

# Lead Developer Review Questions

Please answer these explicitly in the final review:

1. Is the PR split correct?
   - `PR 1` Stage-1 contract hardening
   - `PR 2` matrix honesty
   - `PR 3` simplification

2. Is passing directness context into contract validation the right minimum fix, or is additional claim metadata required for robust enforcement?

3. Is the count-only matrix redesign the right minimum honesty fix for this wave, or is there a safer display strategy?

4. Is the trust-the-LLM provenance gap acceptable as a temporary residual risk if Track 1 otherwise lands cleanly, or should it be narrowed in the same PR?

5. Are the proposed deletions safe in this wave?
   - `articleVerdictOverride`
   - deprecated dominance compatibility in result types
   - dead adjudication-path literals

6. Are the required tests sufficient, especially:
   - early `report_damaged` regression
   - directness-context contract test
   - live/export matrix semantic alignment

# Approval Bar

The plan should be approved only if the Lead Developer agrees that:

1. The plan fixes the remaining correctness hole without adding new deterministic semantic logic.
2. The matrix fix simplifies semantics rather than layering another explanation scheme on top.
3. The deletion track removes real stale surface without creating migration risk for active consumers.
4. The validation checklist is strong enough that the next implementation wave can be judged on repeatable evidence, not one-off runs.

If any of those four points is not met, request changes to the plan before implementation starts.

# Validation Checklist

Before promotion review:

- Stage-1 damaged-report branch is directly exercised by test.
- Swiss anchored input no longer ships normal success on broken contract.
- Coordinated non-anchor split still works.
- Live matrix and export use the same semantics.
- Config drift passes after dead-config removal.
- Build passes.

# Review Questions For Implementers

1. Did you add directness context to contract validation without adding deterministic semantic logic?
2. Did you keep the runtime provenance gate structural-only?
3. Did you resist adding more overlapping Pass-2 rules?
4. Did you make the matrix simpler, not more clever?
5. Did you actually delete stale config/types/docs instead of leaving TODOs?

# Recommendation

Approve implementation of Tracks 1–4 in the PR split above.

This is now the right balance:
- fix the remaining correctness hole
- fix the user-visible report honesty problem
- add the missing regression guard
- remove stale surface while the context is fresh

Do not start another broad prompt-augmentation wave before this plan lands.
