# Lead Developer Companion Review - Claim Extraction Fidelity

**Date:** 2026-02-18  
**Role:** Lead Developer  
**Status:** Investigation complete. Phase 1 (prompt hardening) + Phase 2 (Gate 1 fidelity gate) implemented in working branch.

## Scope

This companion review combines:
- `Docs/WIP/Pass2_Claim_Quality_Issues_2026-02-18.md` (LLM Expert)
- `Docs/TESTREPORTS/6317f52b158646ee80263bd28e682340.json`
- `Docs/TESTREPORTS/4a915d524423468a8bd475e8b7c3ad43.json`
- `apps/web/prompts/claimboundary.prompt.md`
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`

## Executive Conclusion

The issue is real, repeatable, and severe: Stage 1 Pass 2 is over-anchoring to preliminary evidence instead of user input. This causes claim drift at the very start of the pipeline. Once atomic claims drift, Stage 2 search, clustering, and verdicts all drift with it.

Atomic-claim fidelity is a P0 quality requirement. If claims are wrong, the rest of the pipeline cannot recover.

## Confirmed Findings

### 1) impliedClaim overexpansion is present in both reports (HIGH)

- SRF case:
  - `articleThesis` stays short.
  - `impliedClaim` expands with evidence-specific assertions.
  - See `Docs/TESTREPORTS/6317f52b158646ee80263bd28e682340.json:558` and `Docs/TESTREPORTS/6317f52b158646ee80263bd28e682340.json:560`.
- Sky case:
  - Input is just "The sky is blue."
  - `impliedClaim` expands to Rayleigh mechanism details.
  - See `Docs/TESTREPORTS/4a915d524423468a8bd475e8b7c3ad43.json:938` and `Docs/TESTREPORTS/4a915d524423468a8bd475e8b7c3ad43.json:940`.

### 2) Evidence-report claims are being treated as user claims (HIGH)

- SRF case AC_01 is a study-result report phrased as the main claim.
- See `Docs/TESTREPORTS/6317f52b158646ee80263bd28e682340.json:564`.
- This creates circularity risk: claim content is seeded by preliminary evidence and then "verified" by related evidence.

### 3) Topic/scope injection appears downstream in query generation (HIGH)

- Sky case search queries expand into horizon/sunset/Mars tracks.
- See `Docs/TESTREPORTS/4a915d524423468a8bd475e8b7c3ad43.json:3861`, `Docs/TESTREPORTS/4a915d524423468a8bd475e8b7c3ad43.json:3869`, `Docs/TESTREPORTS/4a915d524423468a8bd475e8b7c3ad43.json:3885`, `Docs/TESTREPORTS/4a915d524423468a8bd475e8b7c3ad43.json:3901`.
- This is a direct cost and focus problem: Stage 2 spends budget on claims injected by Pass 2 drift.

### 4) Prompt and code design currently allow this behavior (HIGH)

- Prompt explicitly frames Pass 2 as evidence-grounded and asks for refined thesis:
  - `apps/web/prompts/claimboundary.prompt.md:74`
  - `apps/web/prompts/claimboundary.prompt.md:91`
  - `apps/web/prompts/claimboundary.prompt.md:127`
- Pass 2 input includes full preliminary evidence statements and source context:
  - `apps/web/src/lib/analyzer/claimboundary-pipeline.ts:920`
- Gate 1 currently validates opinion/specificity only, not claim-to-input fidelity:
  - `apps/web/src/lib/analyzer/claimboundary-pipeline.ts:1072`

## Combined Root Cause

The pipeline currently mixes two incompatible goals in Pass 2:
1. Preserve user thesis fidelity.
2. Increase claim precision from preliminary evidence.

Because the prompt and payload prioritize evidence richness, the model optimizes for precision by importing external specifics. For short or broad inputs, this dominates the original claim semantics.

## Proposal Stack (Combined)

| Priority | Proposal | Effort | Risk | Impact |
|---|---|---:|---:|---:|
| P0 | Add explicit LLM atomic-input detection first (single atomic vs multi-assertion) | ~30-45 min | Low | High |
| P0 | Anchor `impliedClaim` to user input (no evidence expansion) | ~15 min | Low | High |
| P0 | Add explicit self-check: "Could this be written without preliminary evidence?" | ~30 min | Low-Med | High |
| P0 | Extend Gate 1 with input-fidelity validation in same batched call | 2-3h | Low | High |
| P1 | Compress Pass 2 evidence payload to scope signals instead of full statements | 2-4h | Medium | High |
| P1 | Preserve Pass 1 thesis as hard anchor fallback for final thesis fields | 1-2h | Low | Medium-High |
| P1 | Add targeted regression tests for fidelity failure modes | 1-2h | Low | High |

## Implementation Plan

### Phase 0 - Baseline freeze (30 min)

1. Capture current behavior from the two known failing reports as baseline artifacts.
2. Define acceptance criteria (below) before changing prompts/code.

### Phase 1 - Prompt hardening (P0, same session)

1. Update `CLAIM_EXTRACTION_PASS1` and `CLAIM_EXTRACTION_PASS2` in `apps/web/prompts/claimboundary.prompt.md`:
   - LLM must first classify input as `single_atomic_claim` or `multi_assertion_input`.
   - For `single_atomic_claim`, keep one central claim and avoid decomposition/expansion.
2. Update `CLAIM_EXTRACTION_PASS2`:
   - `impliedClaim` must be derivable from input alone.
   - Evidence can refine atomic-claim verifiability, not thesis scope.
3. Add explicit anti-evidence-report rule with transformation guidance:
   - Ban "Study X found Y" style as central claim.
   - Require rewriting to direct verifiable assertion.
4. Keep multilingual neutrality rules unchanged.

### Phase 2 - Gate 1 fidelity check (P0)

1. Extend `CLAIM_VALIDATION` prompt to evaluate `passedFidelity` per claim against original input.
2. Pass original input into Gate 1 render variables.
3. Extend Gate 1 schema and filtering logic:
   - Filter claims failing both existing checks OR failing fidelity.
4. Emit Gate 1 fidelity stats for observability.

Phase 2 implementation status (2026-02-18): ✅ Completed in code (`passedFidelity` added to prompt, schema, filtering, and unit tests).

### Phase 3 - Structural decontamination (P1)

1. Change `runPass2()` payload from full preliminary statements to compressed scope/topic signals.
2. Keep enough metadata for precision (methodology/temporal/boundaries), remove rich finding text.
3. Add fallback anchoring: if Pass 2 thesis diverges, preserve Pass 1 thesis in output.

### Phase 4 - Validation and rollout (P0/P1)

1. Run safe unit tests (`npm test`) plus claimboundary unit suite.
2. Re-run the two target scenarios and compare:
   - thesis drift
   - evidence-report claim incidence
   - query drift breadth
3. If needed, iterate prompt wording once before broader rollout.

## Acceptance Criteria

1. `impliedClaim` remains semantically equivalent to input thesis in both target scenarios.
2. No primary atomic claim is phrased as a source-report/meta-claim.
3. Query expansion stays focused on input-derived claim scope (no unrelated branching such as Mars unless input implies it).
4. Gate 1 exposes fidelity pass/fail per claim and filters non-fidelity claims.
5. For clearly atomic inputs (example: "The sky is blue"), Stage 1 outputs one central atomic claim by default.

## Testing Additions

Add unit tests in `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts` for:
- Gate 1 fidelity schema parsing and filtering.
- Pass 2 anchoring fallback behavior.
- Claim filtering behavior when fidelity fails but specificity passes.

## Recommended Execution Order

1. Implement P0 prompt changes first (fastest, highest leverage).
2. Implement Gate 1 fidelity in same PR to prevent regressions.
3. Implement payload compression in follow-up PR if drift persists.

## Notes

- This plan aligns with AGENTS rules: semantic decisions remain LLM-based, no deterministic keyword heuristics introduced.
- Prompt changes should remain UCM-managed through `*.prompt.md` pipeline flow.
