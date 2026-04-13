# 2026-03-22 Lead Architect — Phase 2 v2 Design: Claim-Aware Cross-Linguistic Supplementation

**Task:** Design Phase 2 v2 after v1's shared-pool approach failed. Deliver: post-mortem, v2 design, minimum viable implementation slice, validation plan, and a go/defer recommendation.

**Role:** Lead Architect + Senior Developer (combined — design + implementation scope)
**Prior chain:** Phase1A (FAIL) → Phase1 prompt (FAIL) → Phase2v1 (FAIL, see handoff)

---

## 1. Phase 2 v1 Post-Mortem

### What was built

A supplementary retrieval pass ran per-AtomicClaim after the contradiction loop, using a supplementary language (DE for EN inputs) with `"main"` iterationType. New items were deduplicated by URL against the pre-pass pool and merged into `state.evidenceItems` — a flat shared pool consumed by all downstream stages.

### What actually happened

The supplementary DE pass ran correctly per-claim, adding DE evidence to the flat pool. But `"main"` iterationType generates both-direction queries following `expectedEvidenceProfile`. The resulting DE evidence was directionally mixed — some items contradicting the claim, some supporting, distributed unevenly across the topic areas corresponding to each AtomicClaim.

Stage 3 (boundary formation) then allocated this flat pool into ClaimAssessmentBoundaries. The DE evidence that addressed "environmental impact" (AC_02) was heavy and mostly contradicting. The DE evidence addressing "waste diversion" (AC_01) was sparse and didn't meaningfully shift that boundary's pool. The "economic viability" (AC_03) boundary shifted moderately.

**Result:** Three boundaries with wildly different truth%: 65% / 50% / 32% — a 33pp inter-boundary spread.

Gate 4 `contextConsistency` (`maxConfidenceSpread: 25`, `reductionFactor: 0.5`) correctly identified that these three boundaries disagree too much to produce a confident aggregate verdict, and halved confidence to 24%.

### Why it's a design flaw, not an implementation bug

The supplementary pass is mechanically correct. The flaw is architectural:

1. **No direction constraint on supplementary queries.** `"main"` iterationType generates queries that target `expectedEvidenceProfile`, which is seeded by the primary-language preliminary search. For EN inputs, the profile describes failure-mode methodology. This means EN main queries AND DE supplementary queries both explore the failure-methodology space, just in different languages. The supplementary DE queries are not directed to counterbalance the EN evidence — they're directed to replicate the profile in a different language. Some happen to find contradicting evidence (German success studies), others find supporting evidence (global recycling failure stats also exist in German).

2. **No per-claim pool awareness.** The flat pool has no claim attribution. The supplementary pass can't know that AC_01's pool is more skewed than AC_02's, so it can't direct more supplementary effort to AC_01.

3. **Interaction with contextConsistency calibration.** When a supplementary pass unevenly rebalances boundaries, it doesn't reduce aggregate confidence — it INCREASES the inter-boundary spread the calibration penalizes. v1 made the problem Gate 4 was designed to catch more visible, not less real.

### What this rules out

- More `supplementaryQueriesPerClaim`: deeper unbalanced queries make inter-boundary spread worse, not better.
- Softening `maxConfidenceSpread` or `reductionFactor`: Gate 4 is working correctly. Softening it hides real quality problems in all runs, not just this experiment.
- Per-claim URL attribution at merge time: EvidenceItems don't carry claim attribution through Stage 2. The flat pool is by design. Fixing this is a larger architectural change than v2 should address.

---

## 2. Phase 2 v2 Design

### Core insight

The v1 failure reduces to one word: the supplementary pass used `"main"` iterationType. The `"contrarian"` iterationType already exists and does exactly what the supplementary pass needs: it generates queries seeking evidence in the **opposite direction** of the current majority.

Supplementary retrieval in a secondary language should be directionally constrained — it exists precisely because the primary language's search space is directionally biased. Adding unconstrained secondary-language queries replicates the primary-language bias in a different language, which is no improvement.

**v2 proposal: use `"contrarian"` iterationType for supplementary, not `"main"`.**

Combined with the existing `languageOverride` parameter, this produces: queries seeking evidence opposite to the current pool majority, in the supplementary language.

### How this fixes the v1 failure mode

With `"contrarian"` iterationType, the supplementary DE pass generates queries like:
- For AC_01 (65% supporting "recycling is pointless"): contrarian + DE → "Kunststoffrecycling Erfolge Deutschland", "Quoten Recycling Bundesländer" → contradicting evidence
- For AC_02 (50% supporting): contrarian + DE → seeks minority direction (contradicting) → "Umweltvorteile Recycling Europa" → contradicting evidence
- For AC_03 (32% supporting = 68% contradicting): contrarian + DE → seeks minority direction (supporting) → "Recycling Marktversagen Kosten" → supporting evidence

Key effect:
- AC_01 and AC_02 both get contradicting DE evidence → both move toward lower truth%
- AC_03 gets supporting DE evidence → moves from 32% toward ~40%
- Inter-boundary spread **shrinks**: 65%/50%/32% → ~55%/45%/40% (illustrative)
- contextConsistency spread drops from 33pp toward ~15pp → penalty lifts → confidence recovers

For DE inputs (21% truth%, pool ~75% contradicting):
- Contrarian + EN → seeks supporting evidence for "recycling is pointless" → finds EN failure-mode evidence
- This is the correct behavior: DE inputs should also see global failure statistics, which the EN search space provides naturally
- DE truth% rises slightly (21% → 25-30%) — still MOSTLY-FALSE, confidence maintained

For FR inputs: same as DE inputs (the supplementary language for FR would be DE, finding German success evidence that contradicts the claim).

### Gating on pool balance (new UCM parameter)

Running supplementary on all claims regardless of pool balance wastes queries and risks noise on already-balanced claims. A pre-check is added:

Before running the supplementary per-claim loop, compute overall pool balance from `state.evidenceItems`:
```
directional = items where claimDirection ∈ {supporting, contradicting}
majorityRatio = max(supporting, contradicting) / total
```

If `majorityRatio > supplementarySkewThreshold`, run supplementary. If already balanced, skip.

`supplementarySkewThreshold` is a new UCM parameter (default 0.55). This is structural arithmetic (counting evidence items) — permitted by AGENTS.md.

### Schema changes

**One new UCM pipeline config parameter:**

```json
"supplementarySkewThreshold": 0.55
```

Description: `"Minimum pool skew ratio (majority direction / total directional) required to trigger the cross-linguistic supplementary pass. Below this threshold, the pool is already balanced enough that supplementary retrieval is skipped (default: 0.55)"`

No changes to `crossLinguisticQueryEnabled`, `supplementaryQueryLanguages`, or `supplementaryQueriesPerClaim`.

### Code changes

In `claimboundary-pipeline.ts`, Step 3.5 of `researchEvidence()`:

**v1 (current in codebase):**
```typescript
for (const claim of claims) {
  checkAbortSignal(jobId);
  await runResearchIteration(claim, "main", searchConfig, extendedPipelineConfig, ...);
}
```

**v2 (proposed):**
```typescript
// Gate: only run supplementary if pool is skewed beyond threshold
const directional = state.evidenceItems.filter(
  (e) => e.claimDirection === "supporting" || e.claimDirection === "contradicting"
);
const supportingCount = directional.filter((e) => e.claimDirection === "supporting").length;
const contradictingCount = directional.filter((e) => e.claimDirection === "contradicting").length;
const directionalTotal = directional.length;
const majorityRatio = directionalTotal > 0
  ? Math.max(supportingCount, contradictingCount) / directionalTotal
  : 0;
const suppSkewThreshold = pipelineConfig.supplementarySkewThreshold ?? 0.55;

if (majorityRatio > suppSkewThreshold) {
  for (const claim of claims) {
    checkAbortSignal(jobId);
    await runResearchIteration(claim, "contrarian", searchConfig, extendedPipelineConfig, ...);
  }
} else {
  console.info(`[Stage2] Cross-linguistic pass skipped (pool ratio ${majorityRatio.toFixed(2)} ≤ threshold ${suppSkewThreshold})`);
}
```

The `extendedPipelineConfig` block remains as in v1 (extending `perClaimQueryBudget` by `supplementaryQueriesPerClaim`). One additional change: set `contrarianMaxQueriesPerClaim` in the extended config to `supplementaryQueriesPerClaim` so the contrarian budget aligns with the supplementary budget:

```typescript
const extendedPipelineConfig: PipelineConfig = {
  ...pipelineConfig,
  perClaimQueryBudget: (pipelineConfig.perClaimQueryBudget ?? 8) + suppQueriesPerClaim,
  contrarianMaxQueriesPerClaim: suppQueriesPerClaim,  // bound supplementary contrarian budget
};
```

> **Implementation note:** Verify whether `runResearchIteration` with `"contrarian"` type reads from `contrarianMaxQueriesPerClaim` or `perClaimQueryBudget`. If from `contrarianMaxQueriesPerClaim` (in the calculation config, not pipeline config), verify it's accessible via `searchConfig` or `pipelineConfig`. If not accessible, the budget may need to be passed differently. This must be confirmed before implementing.

### What does NOT change

- Stage 1 claim extraction: untouched
- Gate 1, Gate 4: untouched
- `verdictDirectionPolicy`: untouched
- The deduplication by `sourceUrl`: unchanged from v1
- The `languageOverride` parameter on `runResearchIteration`: unchanged
- All other UCM parameters

### Files to change

| File | Change |
|------|--------|
| `apps/web/src/lib/config-schemas.ts` | Add `supplementarySkewThreshold` field + transform default + DEFAULT_PIPELINE_CONFIG |
| `apps/web/configs/pipeline.default.json` | Add `"supplementarySkewThreshold": 0.55` |
| `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` | Step 3.5: change `"main"` → `"contrarian"`, add pool balance gate, update extendedPipelineConfig |
| `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts` | Update existing supplementary tests: expect `"contrarian"` type, add gate-threshold tests |

---

## 3. Minimum Viable Implementation Slice

This is a **3-file change** after reading and understanding the current Step 3.5 code:

1. **`config-schemas.ts`**: add `supplementarySkewThreshold` field, default 0.55 (follow existing pattern from `crossLinguisticQueryEnabled` addition)
2. **`pipeline.default.json`**: add `"supplementarySkewThreshold": 0.55` (must match TS default — verified by config-drift test)
3. **`claimboundary-pipeline.ts`**: in Step 3.5, replace 3 lines (the `for` loop and its contents):
   - Add pool balance assessment (4 lines)
   - Change `"main"` → `"contrarian"` (1 word)
   - Update `extendedPipelineConfig` to include `contrarianMaxQueriesPerClaim` (1 line)
   - Add balance gate wrapper around the loop (2 lines)

**Test changes**: update the 2 existing supplementary-pass tests to expect `"contrarian"` as the iterationType argument (was `"main"`). Add 2 new tests:
- `skips supplementary pass when pool is within threshold (majorityRatio ≤ 0.55)`
- `runs supplementary pass with contrarian type when pool is skewed beyond threshold`

**Total: ~15 net code lines changed, ~20 test lines changed.** All other v1 infrastructure reused as-is.

---

## 4. Validation Plan and Decision Gates

### Activation

Same UCM mechanism as v1:
1. PUT `crossLinguisticQueryEnabled: true` (pipeline config), activate
2. Leave `supplementarySkewThreshold: 0.55` (default, no change needed)
3. Leave `supplementaryQueriesPerClaim: 2` (default)

### Validation run set (same as v1 for comparability)

| Run | Input | Baseline truth% | v1 truth% | v2 target |
|-----|-------|----------------|-----------|-----------|
| Run2 EN exact | "Plastic recycling is pointless" | 63% | 53% / 24%conf | <55%, conf ≥60% |
| Run1 DE exact | "Plastik recycling bringt nichts" | 21% | 27% / 67%conf | <35%, conf ≥60% |
| Run4 EN para | "Plastic recycling brings no real benefit." | 55% | 63% / 24%conf | <55%, conf ≥60% |
| Run5 FR exact | "Le recyclage du plastique ne sert à rien" | 15% | 16% / 24%conf | <40%, conf ≥60% |

Also run one regression control per prior practice:
- Hydrogen ("Using hydrogen for cars is more efficient than electricity"): must stay <35% truth, conf ≥60%

### Decision gates

| Gate | Criterion | Target | Action if FAIL |
|------|-----------|--------|----------------|
| G1 | EN exact truth% | <55% | FAIL — contrarian DE queries not counterbalancing EN pool |
| G2 | Confidence (EN/FR) | ≥60% | FAIL — inter-boundary spread still too wide; investigate claim breakdown |
| G3 | Spread (all 4 runs) | <25pp | FAIL — investigate which input remains an outlier |
| G4 | DE exact truth% | <35% | FAIL — contrarian EN queries pushed DE result wrong direction |
| G5 | Hydrogen control | <35%, conf ≥60% | FAIL — supplementary incorrectly fired on Hydrogen |
| G6 | Supplementary fired | Pool ratio log shows >0.55 on EN/FR inputs | SKIP — check if pool balance gate is too strict |

### Diagnostic logging

The console.info line in the gated path should emit:
```
[Stage2] Cross-linguistic pass (de): poolRatio=0.67 > threshold=0.55 → firing contrarian supplementary
[Stage2] Cross-linguistic pass: poolRatio=0.52 ≤ threshold=0.55 → skipped
```

Check these logs for every validation run to confirm the gate behaves as expected before evaluating gate criteria.

### If G2 fails (confidence still collapses)

Run the claim-level breakdown (as done for v1 EN exact analysis). Check inter-boundary spread:
- If spread >25pp: contrarian supplementary is still uneven → increase `supplementaryQueriesPerClaim` to 4 and re-run once
- If spread ≤25pp but confidence still low: Gate 4 is triggering on something else → investigate quality gates output for that run

### If G4 fails (DE pushed wrong direction)

Lower `supplementarySkewThreshold` from 0.55 to 0.65 via UCM and re-run DE exact. If DE exact pool ratio is <0.65, supplementary won't fire and DE results stabilize.

---

## 5. Go/Defer Recommendation

### Recommendation: **Go — implement v2**

**Rationale:**

1. **The code change is 3 files, ~15 lines net.** v1's infrastructure is in place. The conceptual change is one word (`"main"` → `"contrarian"`). Implementation risk is minimal.

2. **The mechanism is theoretically sound and not speculative.** Contrarian iterationType already works (confirmed by Phase 1A experiment — contrarian fired correctly at 0.65 threshold). The new behavior here is directing that same mechanism at the supplementary language. No new LLM behavior is being asked for.

3. **The failure mode of v2 is predictable and handleable.** If contrarian supplementary still causes inter-boundary spread, the evidence will show it immediately in the claim-level breakdown. The escape hatch (increase `supplementaryQueriesPerClaim`, lower `supplementarySkewThreshold`) is available without code changes. The UCM flag stays off by default — no production impact from the experiment.

4. **There is no lower-friction alternative.** All prompt/UCM interventions are exhausted. The only remaining path to reduce the 48pp spread is a structural change to retrieval. This is the minimum viable version of that change.

5. **Deferring does not reduce the problem — it just names it.** The 48pp spread remains. EN exact consistently lands LEANING-TRUE when the consensus across languages is more nuanced. Users submitting EN-language claims about global topics will get systematically different verdicts than users submitting DE-language claims. This is a correctness issue, not cosmetic.

### What deferring would mean

Accept the 48pp spread as a known limitation of the current pipeline. Document it in `Docs/STATUS/Current_Status.md` as "language-driven evidence pool asymmetry — known open issue, requires cross-linguistic retrieval redesign." This is a valid product decision if the team's priority shifts to other issues. But v2 is cheap enough that the question is whether to implement now (this session) or in a future session.

### Conditions for deferral

Defer only if:
- v2 implementation has a dependency blocker (e.g., `contrarianMaxQueriesPerClaim` is in calculation config and not accessible from pipeline context — needs investigation before coding)
- A higher-priority defect or feature preempts this work
- The Captain decides the Plastik spread is within acceptable tolerance for the current product stage

---

## 6. Open Items and Constraints

1. **`contrarianMaxQueriesPerClaim` accessibility:** This parameter currently lives in the **calculation** config (UCM `calculation/default`), not the pipeline config. The `extendedPipelineConfig` in v1 only modifies pipeline config. Verify whether `runResearchIteration` → `generateResearchQueries` (contrarian type) uses `contrarianMaxQueriesPerClaim` from a calculation config object, or from the pipeline config. If it reads from calculation config, the extended pipeline config trick won't bind the budget, and the contrarian pass may use the global `contrarianMaxQueriesPerClaim` value instead. This must be confirmed by reading the code before implementing.

2. **Config-drift test:** After adding `supplementarySkewThreshold` to both TS and JSON, run `npm test` — the drift test in `test/unit/lib/config-drift.test.ts` will catch any mismatch.

3. **Post-v2 monitoring:** If v2 passes gates and is promoted to default, track `majorityRatio` in job events (or admin logs) so future runs can be assessed for whether the balance gate is firing correctly.

4. **Boundary concentration secondary signal:** After Phase 2 passes, check whether single-boundary dominance (observed as CB_34: 92.3% in A1 Run3) reappears. If it does, that's a separate investigation.

---

## State After This Design

- `crossLinguisticQueryEnabled`: **false** (UCM) — no change until Captain approves implementation
- Code: v1 implementation stays in codebase (behind flag), will be updated in-place by v2
- This document: design deliverable, awaiting Captain approval before any code change

## Files Touched

- This handoff file (created)
- `Docs/AGENTS/Agent_Outputs.md` (entry to be appended)

## Key Decisions

- v2 changes `"main"` → `"contrarian"` as the supplementary iterationType — this is the minimal fix
- Adds `supplementarySkewThreshold: 0.55` as a new UCM gate to avoid running supplementary on already-balanced pools
- Budget: `contrarianMaxQueriesPerClaim` in extendedPipelineConfig (verify accessibility before coding)
- Recommendation: implement in current session if contrarianMaxQueriesPerClaim is accessible from pipeline context

## Warnings

- **Do not run** `npm test:llm` or `npm test:cb-integration` during v2 implementation — use `npm test` (safe) + build only.
- If v2 also fails (gates G1-G5 not all passing), the correct next step is `claim-level balance audit per boundary` — check if boundary assignment itself is the remaining structural driver. That would be Phase 2 v3 / boundary formation redesign, a larger change.
- Do NOT lower `supplementarySkewThreshold` below 0.50. Below 50%, the pool is already near-balanced and supplementary would add noise.

## For Next Agent

**If implementing v2:**
1. Read `claimboundary-pipeline.ts` Step 3.5 (current v1 code, ~15 lines starting after the contradiction loop and before SR batch eval)
2. Confirm: does `runResearchIteration` for `"contrarian"` type read `contrarianMaxQueriesPerClaim` from (a) calculation config object or (b) pipeline config? If (a), add a calculation config override to extendedPipelineConfig, or use `supplementaryQueriesPerClaim` as the direct budget cap in a wrapper.
3. Make the 3-file change (schemas, JSON, pipeline), run `npm test` + build, then activate via UCM and run the 4-input validation batch.
4. After runs complete: evaluate gates G1-G6, write results to a Handoffs file.

**If v2 passes:** Promote `crossLinguisticQueryEnabled: true` as new UCM default via `PUT pipeline/default` + activate. Update this as a new known good config. Document spread resolution.

**If v2 fails:** Do NOT try a v3 immediately. Bring findings back to Captain with the boundary-level breakdown.
