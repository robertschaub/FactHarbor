---
### 2026-03-30 | Senior Developer | Claude Code (Opus 4.6) | Claim-Local Verdict Scope Fix

## 1. Executive Summary

Fixed a structural bug in Stage 4 (verdict-stage.ts) where direction validation and direction repair received the entire boundary evidence pool instead of claim-local evidence. This caused cross-claim contamination: a claim with neutral/weak local evidence could fail direction integrity because sibling claims' strong evidence leaked into the validation context, triggering false-positive `verdict_integrity_failure` downgrades.

Primary anchor case: `9e4d3712e12d49bc8cadd601766e5f4b` — AC_02's direction validation cited "6 supports / 3 contradicts" from sibling claims when AC_02's actual local pool contained only 4 neutral items.

## 2. What Changed

**Files modified:**
- `apps/web/src/lib/analyzer/verdict-stage.ts` — Added `getClaimLocalEvidence()` helper and applied it to 3 call sites
- `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts` — Added 10 new tests (5 unit + 5 integration)

**Code changes in verdict-stage.ts:**

1. **New exported helper: `getClaimLocalEvidence(claimId, verdict, allEvidence)`** (lines 1438-1483)
   - Priority 1: Evidence where `relevantClaimIds` includes the current claimId
   - Priority 2: Evidence cited by the verdict (`supportingEvidenceIds` + `contradictingEvidenceIds`) even if mapping is incomplete
   - Priority 3: Falls back to full pool only when claim-local + cited subset is empty (fail-open)

2. **Batch direction validation** (lines 1081-1106): Changed from passing a single global `evidencePool` to embedding per-verdict claim-local evidence pools inside each verdict object in the `verdicts` array.

3. **`attemptDirectionRepair()`** (line 1579): Filters evidence through `getClaimLocalEvidence()` before building the repair request's `evidencePool` and `evidenceDirectionSummary`.

4. **`validateDirectionOnly()`** (lines 1611-1646): Filters evidence through `getClaimLocalEvidence()` before passing to the re-validation LLM call.

**Not changed (by design):**
- Grounding validation — remains global (ID existence is a structural check, not semantic)
- `isVerdictDirectionPlausible()` — already claim-local by design (uses only cited IDs from the verdict)
- No Stage 1 prompt changes, no article adjudication changes, no aggregation changes

## 3. Claim-Local Scoping Design

```
For each claim's direction validation/repair:

1. relevantClaimIds membership  →  claim-local evidence
2. + cited evidence IDs         →  handles incomplete mapping
3. union is empty?              →  fallback to full pool (fail-open)
```

The helper is deterministic, uses no semantic matching, and operates purely on ID membership. It handles three edge cases:
- Evidence mapped to multiple claims (included for each)
- Evidence cited by verdict but not in `relevantClaimIds` (included via cited set)
- No local or cited evidence at all (falls back to full pool with no error)

## 4. Tests

**`getClaimLocalEvidence` unit tests (5):**
- Returns only evidence mapped via `relevantClaimIds`
- Includes cited evidence even when `relevantClaimIds` mapping is missing
- Does not duplicate evidence that is both claim-local and cited
- Falls back to full pool when claim-local + cited is empty
- Does not fall back when cited evidence exists but `relevantClaimIds` points elsewhere

**Cross-claim contamination integration tests (5):**
- **9e4d anchor case**: AC_02 with neutral local evidence does not see AC_01's 6 supports in direction validation
- **Repair path**: Direction repair receives only claim-local evidence, not sibling evidence
- **Re-validation path**: `validateDirectionOnly` after repair also uses claim-local evidence
- **Grounding unchanged**: Grounding validation still receives the full evidence pool
- **No regression**: Standard single-claim validation works unchanged

## 5. Risks / Regressions

**Low risk:**
- The fix is purely structural (ID filtering), not semantic
- Full pool fallback ensures no claim is left without evidence for validation
- Grounding validation unchanged (correctly global)
- All 1481 existing tests pass, build succeeds

**Potential concerns:**
- The batch direction validation now embeds `evidencePool` per-verdict instead of at the top level. The LLM prompt contract (`VERDICT_DIRECTION_VALIDATION`) now receives evidence scoped per verdict. This is architecturally cleaner but changes the prompt input shape. Since the prompt handles evidence per-verdict anyway (each verdict has its own cited IDs), this should be transparent to the LLM.
- If any evidence has empty `relevantClaimIds` AND is not cited by any verdict, it will only appear via the full-pool fallback. This is the correct behavior — unclaimed evidence should not contaminate direction validation.

## 6. Final Judgment

**Keep.** The fix is minimal (one 20-line helper, 3 one-line call-site changes), structurally sound, and directly addresses the root cause identified in the architect review. The 9e4d anchor case would no longer produce a false `verdict_integrity_failure` for AC_02. Stage 1 proxy decomposition remains a separate follow-up.

**Verification:**
- `npm test` — 1481 passed, 1 skipped
- `npm -w apps/web run build` — success
- Focused verdict-stage tests — 157 passed
