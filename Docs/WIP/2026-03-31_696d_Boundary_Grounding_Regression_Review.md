# Regression Review: Job 696d8140 — Ghost Boundary + Grounding Validation

**Date:** 2026-03-31
**Role:** Lead Architect / Code Reviewer
**Agent:** Claude Code (Opus 4.6)
**Job:** `696d81406d5a4fbfaa4c23ec49fe4e85`
**Commit hash from job:** `4d93516e+05c646af`

---

## 1. Executive Summary

The regression analysis is **correct**. Two distinct defects are present in job `696d8140`, and they have different origins:

1. **Ghost boundary (`CB_37`)** — an older latent structural bug present since the original verdict-stage introduction (`db563471`, 2026-02-16). `parseBoundaryFindings()` has never validated boundary IDs against known boundaries. No recent commit introduced or worsened this.

2. **Grounding validation false positives** — a recent regression introduced by commit `20f11239` (2026-03-27, FLOOD-1). That commit added `sourcePortfolioByClaim`/`trackRecordScore` to verdict debate prompts but left `VERDICT_GROUNDING_VALIDATION` unchanged. The grounding validator now correctly follows its instructions by flagging source-portfolio references it cannot trace — but its instructions are no longer complete given the expanded verdict reasoning context.

The proposed fix sequence (boundary sanitization first, grounding refresh second) is correct.

---

## 2. What the Job Proves

### Observed symptoms
- `AC_01` emits structural warning: `Verdict AC_01: boundary ID "CB_37" not in boundaries`
- `AC_01` emits a long `verdict_grounding_issue` referencing source IDs (`S_025`, `S_031`, `S_037`) and `trackRecordScore` concepts
- The grounding warning describes evidence IDs that "exist in evidence pool" — the validator is not flagging missing evidence, but source-portfolio references it cannot validate

### What this tells us
1. The advocate LLM hallucinated boundary `CB_37` (likely a sub-perspective of merged boundary `CB_03`). The parse layer accepted it without question. The structural consistency check detected it post-hoc but did not strip it — invalid findings flowed through debate Steps 2-4 and into range computation.

2. Verdict reasoning now legitimately references source-level data (`S_025`, `trackRecordScore`) because the FLOOD-1 prompts instruct the model to reason about source concentration and track records. But `VERDICT_GROUNDING_VALIDATION` was not updated to recognize these as valid contextual references. The validator sees them as ungrounded claims because its input only contains `evidencePool` (evidence IDs + statements).

---

## 3. Regression Assessment

### Defect 1: Ghost boundary — NOT a regression

| Evidence | Finding |
|----------|---------|
| `parseBoundaryFindings()` (verdict-stage.ts:1965) | Accepts any string as `boundaryId`. No validation since introduction. |
| `parseAdvocateVerdict()` (verdict-stage.ts:621) | Calls `parseBoundaryFindings()` without boundary context — boundaries list not in scope. |
| Original commit `db563471` (2026-02-16) | Introduced verdict-stage with this exact parse behavior. |
| `runStructuralConsistencyCheck()` (verdict-stage.ts:1746) | Detects invalid IDs but only emits warnings — does not strip them. |
| Commits `03387283`, `7fdf2b44`, `17da5b84` | Article adjudication and claim-local evidence work — none touched boundary parsing or validation. |

**Conclusion:** Older latent structural flaw. The LLM has always been able to hallucinate boundary IDs; the system has always accepted them unchecked at parse time.

### Defect 2: Grounding false positives — IS a regression from `20f11239`

| Evidence | Finding |
|----------|---------|
| Commit `20f11239` (2026-03-27) | Added `sourcePortfolioByClaim` to VERDICT_ADVOCATE, VERDICT_CHALLENGER, VERDICT_RECONCILIATION prompts. Added mandatory SR-awareness instructions. |
| `validateVerdicts()` grounding input (verdict-stage.ts:1062) | Still passes only `evidencePool` (id + statement). No source portfolio data. |
| VERDICT_GROUNDING_VALIDATION prompt (claimboundary.prompt.md:1139) | Instructs: "If a verdict references evidence claims not traceable to any cited ID, flag it." Source IDs and trackRecordScore are now in verdict reasoning but have no corresponding entries in the validator's input. |
| Post-FLOOD-1 commits (`db7cdcf8`, `e1f2c551`, `17da5b84`) | None touched grounding validation inputs or prompt. None contributed to this defect. |

**Conclusion:** Regression introduced by `20f11239`. The FLOOD-1 change correctly expanded debate context but failed to update the downstream validation contract.

### Did any other recent commit contribute?

| Commit | Verdict |
|--------|---------|
| `03387283` (article adjudication) | Not involved — doesn't touch grounding validation |
| `7fdf2b44` (remove article-truth clamp) | Not involved — aggregation-only change |
| `17da5b84` (claim-local evidence) | Changed direction validation only, not grounding validation |
| `e1f2c551` (reconciliation citation carriage) | Parser changes, doesn't affect grounding validation input |
| `db7cdcf8` (self-consistency rescue) | Rescue boost logic, doesn't affect grounding validation |

**No additional causal contributors identified.**

---

## 4. Evaluation of the Proposed Fix Path

### Fix 1: Boundary sanitization — APPROVED with refinement

**Proposed:** Sanitize `boundaryFindings` against valid boundary IDs; drop invalid IDs rather than guessing remaps.

**Assessment:** Correct approach. Drop-not-remap is the right policy — deterministic remapping would be a semantic heuristic (prohibited by AGENTS.md). Structural filtering is appropriate.

**Refinement — scope of validation:**
- **Should validate per-claim**, using `coverageMatrix.getBoundariesForClaim(claimId)`, not just the global boundary set.
- **Why:** `computeTruthPercentageRange()` (verdict-stage.ts:1896) uses ALL `verdict.boundaryFindings` for range widening without checking whether those findings belong to boundaries that cover this claim. A boundary ID that exists globally but doesn't cover this claim would pass a global-set check but still produce incorrect range widening.
- **Risk mitigation:** If coverage matrix is incomplete (edge case), the filter is fail-safe — the structural consistency check already warns about zero-coverage claims. A finding for a boundary the claim doesn't belong to is analytically meaningless regardless.

**Implementation point:** Sanitize immediately after `parseBoundaryFindings()` returns, inside `parseAdvocateVerdict()` — this requires passing `coverageMatrix` or the valid boundary IDs for the claim into that function. Alternatively, sanitize in `advocateVerdict()` before returning, where both `claimBoundaries` and `coverageMatrix` are in scope.

### Fix 2: Grounding validation refresh — APPROVED

**Proposed:** Update `VERDICT_GROUNDING_VALIDATION` input and prompt to recognize source-portfolio references.

**Assessment:** Correct. Two sub-changes needed:
1. **Input expansion:** Pass `sourcePortfolioByClaim` (or a flattened source ID list) alongside `evidencePool` to the grounding validator.
2. **Prompt update:** Add instruction that source IDs from the source portfolio and `trackRecordScore` references are valid context, not hallucinated evidence claims. The validator should check that referenced source IDs exist in the portfolio — but should not flag portfolio-derived reasoning as ungrounded.

**Ordering:** This is correctly sequenced as Fix 2 (after boundary sanitization). The grounding fix is slightly more complex because it touches prompt + plumbing, while boundary sanitization is pure structural code.

### Fix 3: Prompt hardening (optional) — APPROVED as low-priority

**Proposed:** Add explicit instruction to VERDICT_ADVOCATE constraining `boundaryFindings[].boundaryId` to provided boundary IDs.

**Assessment:** Belt-and-suspenders. LLM compliance with this instruction can't be guaranteed, so it doesn't replace structural sanitization. But it reduces the probability of ghost boundaries. Low risk, low effort. Implement if convenient, but don't block the primary fixes on it.

---

## 5. Risks / Cautions

### Do NOT change
- Article adjudication logic (`03387283`, `7fdf2b44`) — causally uninvolved
- Report matrix / Stage 5 aggregation logic — not the source of either defect
- Stage 1 claim extraction — not involved
- Direction validation (`17da5b84`) — already correctly scoped, unrelated to grounding
- No deterministic semantic heuristics of any kind (AGENTS.md mandate)

### Implementation risks
1. **Per-claim filtering depends on coverage matrix completeness.** If the coverage matrix is built after advocate verdicts (timing issue), the filter would have nothing to validate against. Verify that `coverageMatrix` is available before/during verdict parsing. (It should be — it's built in Stage 3, before Stage 4.)

2. **Grounding validation prompt change must not become an analytical judgment.** The validator should check structural grounding (do these IDs exist?), not whether the model's use of track-record scores is analytically correct. Keep the validation scope narrow.

3. **Range widening with `boundaryVarianceWeight > 0`** is the only place where ghost boundaries currently affect numerical output. If `boundaryVarianceWeight` is 0 (default), the immediate numerical impact is nil. Check the UCM default before prioritizing.

4. **`computeTriangulationScore` is already safe** against ghost boundaries — it iterates `boundaryIds` from `coverageMatrix.getBoundariesForClaim()`, not from `boundaryFindings`. A ghost `CB_37` in findings would simply not match any coverage-matrix boundary and would be skipped. This is a fortunate accident, not by design.

### Validation gate (required before done)
1. `npm test` — all unit tests pass
2. `npm -w apps/web run build` — compilation succeeds
3. Add unit test: `parseBoundaryFindings`/`advocateVerdict` with a ghost boundary ID → verify it's stripped from output
4. Add unit test: `VERDICT_GROUNDING_VALIDATION` input includes source portfolio → verify no false-positive grounding warnings for source IDs
5. Re-run the same input (or comparable multi-boundary input) → verify:
   - Zero `boundary ID not in boundaries` structural warnings
   - Zero false-positive `verdict_grounding_issue` warnings from source-portfolio references
   - Verdict quality is not degraded (truth percentages and confidence within normal variation)

---

## 6. Final Judgment

**Regression analysis confirmed**

The diagnosis correctly separates two independent defects with distinct origins:
- Ghost boundary: latent structural flaw since `db563471` (2026-02-16), never sanitized at parse time
- Grounding false positives: regression from `20f11239` (2026-03-27), contract mismatch between expanded debate context and unchanged validation scope

The proposed fix sequence (boundary sanitization first, grounding refresh second, optional prompt hardening third) is correct in both ordering and approach. One refinement: boundary sanitization should filter per-claim (against `coverageMatrix.getBoundariesForClaim(claimId)`) rather than against the global boundary set, to also prevent cross-claim boundary findings from affecting range computation.

No other recent commits are causally involved. The fix scope is correctly constrained — no article adjudication, matrix, Stage 1, or deterministic semantic changes are needed.
