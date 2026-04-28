# Check-Worthiness Phase 1a Implementation Plan

**Date**: 2026-04-29  
**Role**: Lead Architect  
**Status**: Review-debated; implementation-ready with accepted comments  
**Parent decision**: `Docs/WIP/2026-04-28_Remaining_Unification_Architecture_Assessment.md`  
**Scope**: Phase 1a only - no-behavior check-worthiness contract and display cleanup

---

## Executive Summary

The next implementation slice should fix the remaining concrete `checkWorthiness` drift without changing analysis behavior.

The architecture decision is already made:

- Stage 1 owns `AtomicClaim` extraction and Gate 1 validity.
- ACS-CW owns post-Gate-1 recommendation over Stage 1 claim IDs.
- `AtomicClaim.checkWorthiness` is Stage 1 advisory metadata, not ACS selector authority.

Phase 1a should therefore do only four things:

1. Widen the remaining narrow `AtomicClaim.checkWorthiness` TypeScript contract from `"high" | "medium"` to `"high" | "medium" | "low"`.
2. Relabel user/admin display surfaces so this field is visibly Stage 1 advisory metadata, not ACS recommendation authority.
3. Sync architecture diagrams that enumerate `AtomicClaim.checkWorthiness` values.
4. Add focused verification for the widened value, display label, and absence of live downstream enum assumptions.

Everything else from the parent assessment stays deferred to later phases.

---

## Current Source Facts

### Type contracts

`apps/web/src/lib/analyzer/claim-extraction-stage.ts:118` already accepts:

```ts
checkWorthiness: z.enum(["high", "medium", "low"]).catch("medium")
```

`apps/web/src/lib/analyzer/types.ts:425` already has the older Stage 1-facing `ClaimUnderstanding.subClaims[].checkWorthiness` surface widened to:

```ts
checkWorthiness: "high" | "medium" | "low";
```

The remaining narrow live ClaimBoundary contract is `apps/web/src/lib/analyzer/types.ts:1074`:

```ts
checkWorthiness: "high" | "medium";
```

There is already at least one test fixture value with `checkWorthiness: "low"` in `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts:1753`, which means the source has moved toward the widened contract but the exported interface still lags.

### Display labels

The selection UI currently renders:

```tsx
Check-worthiness: {claim.checkWorthiness}
```

at `apps/web/src/app/analyze/select/[draftId]/ClaimSelectionPanel.tsx:106`, adjacent to ACS recommendation fields such as directness and evidence yield.

The HTML report currently renders:

```ts
Check-worthiness: ${esc(ac.checkWorthiness)}
```

at `apps/web/src/app/jobs/[id]/utils/generateHtmlReport.ts:515`.

These labels keep the old ambiguity alive because "check-worthiness" can be read as ACS-CW recommendation authority. In the current architecture, this field is only a Stage 1 extraction-time advisory hint.

### Documentation diagrams

The following architecture diagrams still describe `AtomicClaim.checkWorthiness` as high/medium only:

- `Docs/xwiki-pages/FactHarbor/Product Development/Diagrams/Analysis Entity Model ERD/WebHome.xwiki`
- `Docs/xwiki-pages/FactHarbor/Product Development/Diagrams/Core Data Model ERD/WebHome.xwiki`
- `Docs/xwiki-pages/FactHarbor/Product Development/Diagrams/Entity Views/WebHome.xwiki`

These should be synced in the same implementation slice if the source contract is widened. This is documentation alignment only, not a new behavior or DTO track.

### Non-live drift note

`apps/web/src/lib/analyzer/quality-gates.ts` exports `applyGate1Lite`, including comments and logic for filtering low `checkWorthiness`. Current source search shows no imports or call sites. Phase 1a should not revive, modify, or extend that function. Any cleanup of dead Gate 1 Lite semantics should be handled as a separate debt task if needed.

---

## Implementation Objective

Make the Stage 1 advisory field internally consistent and externally clear, while preserving all existing behavior:

- no prompt changes;
- no LLM model-routing changes;
- no ACS-CW prompt or metric attribution changes;
- no recommendation algorithm changes;
- no Gate 1 filtering changes;
- no validation entrypoint changes;
- no C# API/read-model changes unless read-only source search shows a live parser, DTO, enum, or display surface for this field.

The correct behavioral outcome is that the same claims are extracted, recommended, selected, researched, and reported as before. Only the TypeScript contract and display wording change.

---

## Proposed Code Changes

### 1. Widen `AtomicClaim.checkWorthiness`

File:

- `apps/web/src/lib/analyzer/types.ts`

Change:

```ts
- checkWorthiness: "high" | "medium";
+ /** Stage 1 extraction-time advisory hint. Not ACS recommendation authority. */
+ checkWorthiness: "high" | "medium" | "low";
```

Rationale:

- This aligns `AtomicClaim` with `Pass2AtomicClaimSchema`.
- It aligns `AtomicClaim` with `ClaimUnderstanding.subClaims`.
- It avoids silently lying in TypeScript about an output the Stage 1 schema already allows.
- It does not change runtime behavior by itself.

Do not introduce a new enum type unless nearby code already has a suitable local pattern. This is a one-field cleanup; a shared enum can be considered later if more claim-advisory metadata is unified.

### 2. Rename selection UI label

File:

- `apps/web/src/app/analyze/select/[draftId]/ClaimSelectionPanel.tsx`

Change the display label from:

```tsx
Check-worthiness: {claim.checkWorthiness}
```

to:

```tsx
Stage 1 extraction hint: {claim.checkWorthiness}
```

Rationale:

- "Stage 1" identifies the producing authority.
- "extraction hint" identifies the lifecycle point while keeping the value advisory.
- It avoids implying that the field is the ACS recommendation result.

Do not rename ACS labels such as `Directness`, `Evidence yield`, triage, or recommendation text in this slice.

### 3. Rename HTML report label

File:

- `apps/web/src/app/jobs/[id]/utils/generateHtmlReport.ts`

Change the display label from:

```ts
Check-worthiness: ${esc(ac.checkWorthiness)}
```

to:

```ts
Stage 1 extraction hint: ${esc(ac.checkWorthiness)}
```

Rationale:

- The final report should not reintroduce a label that confuses Stage 1 metadata with ACS-CW recommendation authority.
- This keeps UI and report copy aligned.

### 4. Sync architecture diagrams

Files:

- `Docs/xwiki-pages/FactHarbor/Product Development/Diagrams/Analysis Entity Model ERD/WebHome.xwiki`
- `Docs/xwiki-pages/FactHarbor/Product Development/Diagrams/Core Data Model ERD/WebHome.xwiki`
- `Docs/xwiki-pages/FactHarbor/Product Development/Diagrams/Entity Views/WebHome.xwiki`

Change only the enumerated `AtomicClaim.checkWorthiness` value descriptions from high/medium to high/medium/low. Do not rewrite diagram structure or user-visible/internal field classification in this slice.

### 5. Focused test updates

Search first:

```powershell
rg -n "Check-worthiness|Stage 1 priority hint|Stage 1 extraction hint|checkWorthiness" apps/web/src apps/web/test
```

Update or add tests only where an existing harness naturally covers the touched surface:

- If there is an existing report-generation test around claim metadata chips, assert the new `Stage 1 extraction hint` label.
- If there is an existing selection-panel render test, assert the new `Stage 1 extraction hint` label.
- If there is no existing UI/report harness, do not build a broad new test framework for this slice. Use source grep plus build verification, and treat that as implementation verification rather than long-term regression protection.
- Preserve or add one low-value `AtomicClaim` fixture in TypeScript-facing tests so the widened contract is exercised by compilation where practical.

Do not add LLM tests, expensive validation, or live jobs for this no-behavior cleanup.

---

## Implementation Sequence

1. Confirm current drift:

   ```powershell
   rg -n "checkWorthiness|Check-worthiness" apps/web/src apps/web/test
   rg -n "checkWorthiness\s*(===|!==|==|!=)|switch\s*\([^)]*checkWorthiness" apps/web/src apps/web/test
   rg -n "applyGate1Lite" apps/web/src apps/web/test
   rg -n "checkWorthiness|AtomicClaim|ClaimSelectionJson|PreparedStage1Json" apps/api
   ```

2. Patch `apps/web/src/lib/analyzer/types.ts`.

3. Patch `ClaimSelectionPanel.tsx`.

4. Patch `generateHtmlReport.ts`.

5. Patch xWiki diagram value lists that still describe `checkWorthiness` as high/medium only.

6. Update any focused tests already covering these labels or low-value `AtomicClaim` fixtures.

7. Run verification.

8. Record the result in the Agent Exchange Protocol output.

---

## Verification Plan

Required:

```powershell
rg -n "Check-worthiness" apps/web/src apps/web/test
rg -n "Stage 1 priority hint" apps/web/src apps/web/test
rg -n "checkWorthiness\s*(===|!==|==|!=)|switch\s*\([^)]*checkWorthiness" apps/web/src apps/web/test
rg -n "checkWorthiness|AtomicClaim|ClaimSelectionJson|PreparedStage1Json" apps/api
rg -n 'string checkWorthiness "high_medium"' Docs/xwiki-pages
rg -n 'string checkWorthiness "high medium"' Docs/xwiki-pages
npm -w apps/web run build
git diff --check
```

Expected:

- No `Check-worthiness` label remains in `apps/web/src`.
- No `Stage 1 priority hint` label is introduced.
- The downstream-assumption search finds only the known non-live `applyGate1Lite` comparison unless a new finding is documented before implementation continues.
- The API search finds no C# `checkWorthiness` parser, enum, or display surface; raw JSON storage columns such as `ClaimSelectionJson` and `PreparedStage1Json` are not blockers.
- Both xWiki formatting variants, underscore-separated `high_medium` and space-separated `high medium`, are checked and no longer describe `AtomicClaim.checkWorthiness` as high/medium only.
- `AtomicClaim.checkWorthiness` accepts `"low"` at compile time.
- Build passes.
- Whitespace check passes.

Conditional:

```powershell
npm -w apps/web exec vitest run <focused-test-file>
```

Run focused Vitest files only if the implementation updates or adds tests. Do not run expensive LLM-backed suites.

Not required:

- live analysis jobs;
- validation matrix runs;
- prompt-loader tests;
- C# API tests, unless read-only source search shows C# consumes the field with a live narrowed contract.

---

## Acceptance Criteria

Phase 1a is complete when:

- `AtomicClaim.checkWorthiness` is widened to `"high" | "medium" | "low"`.
- UI/report labels describe the value as a Stage 1 extraction hint.
- ACS recommendation labels remain distinct.
- Architecture diagrams that list `AtomicClaim.checkWorthiness` values are synced to high/medium/low.
- No runtime selector, Gate 1, ACS-CW, model, prompt, or validation entrypoint behavior is changed.
- Source grep confirms the old display label is gone from `apps/web/src`.
- Build and diff checks pass.

---

## Explicit Non-Goals

- No Stage 1/ACS/check-worthiness authority merger.
- No new selector or selector fallback.
- No use of `AtomicClaim.checkWorthiness` to override ACS recommendations.
- No prompt wording changes.
- No prompt-profile migration.
- No ACS-CW metric/task attribution.
- No budget/deferred metadata changes.
- No selected-claim Stage 2 coverage changes.
- No provenance or entrypoint governance changes.
- No C# DTO/read-model contract work unless read-only verification exposes this field as a live cross-language enum, parser, or display surface.
- No cleanup of uncalled `applyGate1Lite` in this slice.

---

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|---|---:|---:|---|
| Implementer broadens into ACS-CW behavior changes | Medium | High | Keep Phase 1a explicitly limited to type and labels. Move attribution/prompt inventory to Phase 1b. |
| UI copy still reads as recommendation authority | Medium | Medium | Use `Stage 1 extraction hint`, not `Check-worthiness`, `priority`, or `Recommendation`. |
| Widening type masks an unexpected downstream assumption | Low | Medium | Run build and focused tests; search for switch/exhaustiveness on `checkWorthiness`. |
| Dead `applyGate1Lite` gets revived accidentally | Low | High | Treat it as non-goal; do not import or alter it in this slice. |
| Tests overexpand beyond risk | Medium | Low | Reuse existing harnesses only; do not build broad UI/report test infrastructure for a label rename. |
| Documentation and source drift again | Medium | Medium | Add this plan and parent decision as references in Agent Exchange output. |
| Architecture diagrams retain high/medium-only enum text | Medium | Low | Sync the three xWiki diagram value lists in the same implementation slice. |

---

## Opportunity Analysis

| Opportunity | Value | How Phase 1a captures it |
|---|---:|---|
| Remove concrete contract drift | High | `AtomicClaim` matches Stage 1 schema and `ClaimUnderstanding`. |
| Reduce future authority confusion | High | Display labels name Stage 1 as the producer. |
| Keep implementation lean | High | No prompt/model/pipeline behavior touched. |
| Lower review burden for later phases | Medium | Phase 1b and later phases can focus on attribution, coverage, provenance, and governance without reopening this type/display ambiguity. |

---

## Handoff to Implementer

Implement this as a small source cleanup, not an architecture refactor.

Before editing, read the exact current snippets in:

- `apps/web/src/lib/analyzer/types.ts`
- `apps/web/src/app/analyze/select/[draftId]/ClaimSelectionPanel.tsx`
- `apps/web/src/app/jobs/[id]/utils/generateHtmlReport.ts`

Then make only the scoped changes above. If build or grep reveals another live surface that displays `Check-worthiness`, update that label to the same `Stage 1 extraction hint` wording. If any verifier reveals a real behavior dependency on the narrow type, stop and document the dependency before adding compatibility logic.

---

## Review Debate Result

Disposition: **APPROVE WITH COMMENTS**.

Accepted comments:

- Replace the proposed `Stage 1 priority hint` copy with `Stage 1 extraction hint`; "priority" still sounds too close to ranking or recommendation authority.
- Add an explicit downstream-assumption verification grep for `checkWorthiness` comparisons or switches. Current source shows only the known non-live `applyGate1Lite` comparison.
- Add an explicit read-only API verification grep for `checkWorthiness`, `AtomicClaim`, `ClaimSelectionJson`, and `PreparedStage1Json`. Current API source stores/exposes raw JSON columns but does not parse this field as a C# enum.
- Soften the test promise: grep/build are implementation verification when no existing UI/report harness exists; do not build broad new harnesses for this label cleanup.
- Add xWiki architecture diagram sync for the high/medium-only `AtomicClaim.checkWorthiness` value lists found during reconciliation.

Deferred or rejected from Phase 1a:

- No `applyGate1Lite` cleanup.
- No ACS-CW attribution, prompt inventory, prompt wording, model routing, selector, Stage 2, provenance, entrypoint, generated DTO, or shared enum work.

Final disposition: implementation-ready as a lean Phase 1a cleanup.

### External Review 1

Disposition: **implementation-ready; no blocking changes required**.

Accepted clarification:

- The xWiki verification now checks the underscore-separated and space-separated `checkWorthiness` value formats with separate grep commands so implementers confirm both diagram formats are updated.

Recorded observations:

- The existing low-value fixture at `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts:1753` currently gets past TypeScript through the surrounding test shape, but the Phase 1a type widening will make that value naturally valid against `AtomicClaim`.
- The `Entity Views` xWiki classification of `checkWorthiness` as internal-only remains correct for a Stage 1 advisory hint and should not be changed in this slice.

### External Review 2

Disposition: **implementation-ready; no blocking changes required**.

Recorded observation:

- `Stage 1 extraction hint` is accurate but somewhat opaque for end users who do not know the pipeline stages. This is acceptable for Phase 1a because the touched selection-panel and HTML-report surfaces are admin/developer-facing. If a future public claim-detail view exposes this field, label wording should be revisited in that separate product-UI slice.

Implementation confirmation:

- The implementer should follow the plan sequence: run the verification greps first, make the scoped type/label/diagram changes, then run the build and diff checks.
