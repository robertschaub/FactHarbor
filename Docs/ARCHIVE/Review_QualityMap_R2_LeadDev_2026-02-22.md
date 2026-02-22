# Review: Report Quality Opportunity Map — Lead Developer Assessment

**Reviewer:** Lead Developer (Claude Code, Sonnet 4.6)
**Date:** 2026-02-22
**Documents reviewed:** `Report_Quality_Opportunity_Map_2026-02-22.md` + `Review_QualityMap_R1_LLMExpert_2026-02-22.md`
**Code verified against:** Current `main` branch (commit `df30245`)
**Verdict:** APPROVE-WITH-AMENDMENTS

---

## Implementation Effort Matrix

With R1 amendments applied, validated against actual code:

| Item | R1-Amended Scope | Files Touched | Hours | New Tests | Effort |
|------|-----------------|---------------|-------|-----------|--------|
| **B-4** | Pro/Con query separation + shared budget (Amend. 3) | 4 | 4-5h | 5-7 | LOW |
| **B-5a** | Challenger prompt improvement | 1 | 2-3h | 2-3 | LOW |
| **B-5b** | Opus tier + reconciler upgrade (Amend. 1) | 5 | 4-5h | 6-8 | LOW-MEDIUM |
| **B-5c** | Opus challenger+reconciler | 0 (config only) | 0.5h | 1 | LOW |
| **B-6** | Verifiability field at Stage 1 (Amend. 2) | 4 | 3-4h | 4-6 | LOW |
| **B-7** | Misleadingness flag in verdict output | 4 | 2-3h | 4-5 | LOW |
| **B-8** | Two-tier explanation quality (Amend. 4) | 4-5 | 4-5h | 6-8 | LOW |
| **Total** | | | **20-26h** | **28-38** | |

**Assessment:** All items remain LOW or LOW-MEDIUM after amendments. Total ~3-4 days of focused implementation work. The "LOW effort" classification holds, but the aggregate is not trivial — 5 concurrent items touching shared files requires careful coordination.

---

## Detailed File Lists Per Item

### B-4: Pro/Con Query Separation + Shared Budget

| # | File | Change |
|---|------|--------|
| 1 | `apps/web/prompts/claimboundary.prompt.md` | Modify `GENERATE_QUERIES` section to emit pro+con query variants |
| 2 | `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` | Modify `generateResearchQueries()` output handling (~line 2088); add per-claim query budget tracking in research loop (~line 1663); add budget enforcement in `runResearchIteration()` |
| 3 | `apps/web/src/lib/config-schemas.ts` | Add `proConQuerySeparation: boolean` and `perClaimQueryBudget: number` to PipelineConfigSchema |
| 4 | `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts` | New tests for query budget enforcement, pro/con variant generation |

### B-5: Strong Challenger (3-step, per Amendment 1)

**Step a — Prompt improvement (independent):**

| # | File | Change |
|---|------|--------|
| 1 | `apps/web/prompts/claimboundary.prompt.md` | Improve `VERDICT_CHALLENGER` section prompt quality |

**Step b — Opus tier support:**

| # | File | Change |
|---|------|--------|
| 1 | `apps/web/src/lib/config-schemas.ts` | Extend `debateModelTiers` Zod enum: `"haiku" \| "sonnet"` → `"haiku" \| "sonnet" \| "opus"`. Update `DEBATE_PROFILES` types. Add Opus model constants. |
| 2 | `apps/web/src/lib/analyzer/verdict-stage.ts` | Extend `VerdictStageConfig.debateModelTiers` type union |
| 3 | `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` | Update `buildVerdictStageConfig()` to resolve `"opus"` tier. Update `createProductionLLMCall()` model selection. |
| 4 | `apps/web/src/lib/calibration/runner.ts` | Update `resolveModelName()` to handle `"opus"` tier |
| 5 | `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts` | Profile resolution tests for opus tier |

### B-6: Verifiability at Stage 1 (per Amendment 2)

| # | File | Change |
|---|------|--------|
| 1 | `apps/web/prompts/claimboundary.prompt.md` | Add `verifiability` field to `CLAIM_EXTRACTION_PASS2` output instructions |
| 2 | `apps/web/src/lib/analyzer/types.ts` | Add `verifiability` to `AtomicClaim` interface (~line 713) |
| 3 | `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` | Add `verifiability` to `Pass2AtomicClaimSchema` (~line 394). Add Gate 1 verifiability routing (flag, not filter). |
| 4 | `apps/web/src/lib/config-schemas.ts` | Add `claimVerifiabilityEnabled: boolean` to PipelineConfigSchema |

### B-7: Misleadingness Flag

| # | File | Change |
|---|------|--------|
| 1 | `apps/web/prompts/claimboundary.prompt.md` | Add `misleadingness` + `misleadingnessReason` to `VERDICT_RECONCILIATION` output schema instructions with explicit decoupling instruction |
| 2 | `apps/web/src/lib/analyzer/types.ts` | Add fields to `CBClaimVerdict` (~line 786) and `OverallAssessment` (~line 989) |
| 3 | `apps/web/src/lib/analyzer/verdict-stage.ts` | Extend reconciliation output Zod schema. Propagate fields through Step 4 output. |
| 4 | `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` | Propagate `misleadingness` through aggregation to `OverallAssessment` |

### B-8: Explanation Quality Check (per Amendment 4)

| # | File | Change |
|---|------|--------|
| 1 | `apps/web/src/lib/analyzer/types.ts` | New `ExplanationQualityScore` interface |
| 2 | `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` | Add deterministic structural checks after narrative generation (~Stage 5). Add optional Haiku rubric-eval call. |
| 3 | `apps/web/prompts/claimboundary.prompt.md` | New `EXPLANATION_QUALITY_EVAL` section (rubric-based) |
| 4 | `apps/web/src/lib/config-schemas.ts` | Add `explanationQualityCheckEnabled: boolean` and `explanationQualityRubricEnabled: boolean` to CalcConfigSchema |
| 5 | `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts` | Structural check unit tests (deterministic, no LLM mocking needed) |

---

## Parallelization Assessment

### File Collision Map

| File | B-1 | B-4 | B-5 | B-6 | B-7 | B-8 | Collision Risk |
|------|-----|-----|-----|-----|-----|-----|---------------|
| `claimboundary-pipeline.ts` | ✓ (createProductionLLMCall) | ✓ (search loop) | ✓ (buildVerdictStageConfig) | ✓ (Stage 1 schema) | ✓ (aggregation) | ✓ (Stage 5) | **HIGH** — 6/6 items |
| `verdict-stage.ts` | ✓ (call metadata) | — | ✓ (tier types) | — | ✓ (output schema) | — | MEDIUM — 3/6 items |
| `claimboundary.prompt.md` | — | ✓ (GENERATE_QUERIES) | ✓ (VERDICT_CHALLENGER) | ✓ (EXTRACT_CLAIMS_PASS2) | ✓ (VERDICT_RECONCILIATION) | ✓ (new section) | MEDIUM — 5/6, but different sections |
| `types.ts` | — | — | — | ✓ (AtomicClaim) | ✓ (CBClaimVerdict) | ✓ (new type) | LOW — different interfaces |
| `config-schemas.ts` | — | ✓ (query budget) | ✓ (opus tier) | ✓ (verifiability toggle) | — | ✓ (quality toggle) | MEDIUM — 4/6, but different schema sections |

### Verdict: Proposed Parallelization Is Feasible But Risky

**B-4 ∥ B-1:** Safe. B-4 touches the search loop (lines ~1663-1766, ~2088). B-1 touches `createProductionLLMCall()` (lines ~3355-3604). Different parts of `claimboundary-pipeline.ts`. Low merge conflict risk.

**B-5 ∥ B-1:** Moderate risk. Both touch `verdict-stage.ts` — B-1 adds role metadata to call sites, B-5b adds opus tier to config types. Different concerns but overlapping file sections. Merge conflicts likely but resolvable.

**B-6 ∥ B-3:** Safe. B-6 modifies Stage 1 (extraction). B-3 modifies Stage 2 (research) and Stage 4 (verdict partitioning). No overlap.

**B-7 ∥ B-3:** Moderate risk. Both touch `verdict-stage.ts` — B-7 adds misleadingness to reconciliation output, B-3 adds evidence partitioning to debate input. Same stage, different aspects. Needs coordination.

**B-8 ∥ B-2:** Safe. B-8 adds a post-verdict quality check. B-2 is a document, not code.

### Hidden Dependency

**B-4 depends on D5#3 design.** D5#3 (contrarian retrieval) is approved but **not yet implemented**. B-4 (pro/con queries) and D5#3 share the same code area (search loop in `claimboundary-pipeline.ts`). Amendment 3 says they need a shared query budget. This means either:
- B-4 and D5#3 must be implemented together (increases B-4 scope), OR
- B-4 is implemented first with the budget framework, and D5#3 plugs into it later

I recommend the second option — B-4 builds the per-claim budget infrastructure, D5#3 (in B-3) consumes it.

---

## Answers to Review Questions

### 1. EFFORT VALIDATION

See Implementation Effort Matrix above. Summary:

**B-4:** LOW holds. The prompt change is trivial. The shared budget framework (Amendment 3) adds ~1-2h but is straightforward — extend `CBResearchState` with per-claim query counters, check budget before issuing queries. Current code already tracks `state.searchQueries` with per-query metadata.

**B-5:** LOW holds for step a (prompt only). LOW-MEDIUM for step b (opus tier). The `debateModelTiers` Zod enum is `z.enum(["haiku", "sonnet"])` at config-schemas.ts:423. Adding `"opus"` cascades through: Zod schema → TypeScript type → `DEBATE_PROFILES` constant type → `VerdictStageConfig` interface → `buildVerdictStageConfig()` → `resolveModelName()`. This is 5 files but each change is mechanical. Still LOW-MEDIUM.

**B-6:** LOW holds. `AtomicClaim` already has `category: "factual" | "evaluative" | "procedural"` which partially overlaps. Adding `verifiability` is a new field in the Zod schema (`Pass2AtomicClaimSchema` at pipeline.ts:394) + type + prompt section. Gate 1 routing is the design question — I recommend **flag-only** for v1 (add to claim metadata, don't filter), with routing in a later iteration.

**B-7:** LOW holds. Adding 2 fields (`misleadingness`, `misleadingnessReason`) to the reconciliation output schema is a standard prompt+schema change. The critical constraint (output-only, no debate loop feedback) is an architecture rule, not code work — the reconciler is Step 4, and Steps 1-3 don't see Step 4 output.

**B-8:** LOW holds. Deterministic structural checks require zero LLM calls and are pure functions — easy to test. The rubric-based Haiku eval is 1 additional call at pipeline end. Total: ~4-5h.

### 2. PARALLELIZATION

See Parallelization Assessment above.

**a. Code-level dependencies preventing parallel implementation?**

No hard dependencies between B-4/B-5 or B-6/B-7. Each touches different pipeline stages/prompt sections. However, `claimboundary-pipeline.ts` is the conflict hotspot — 6/6 items touch it.

**b. Same files as B-1 or B-3?**

B-1 touches: `claimboundary-pipeline.ts` (createProductionLLMCall), `verdict-stage.ts` (call metadata), `metrics.ts`.
B-3 will touch: `claimboundary-pipeline.ts` (research loop + verdict partitioning), `verdict-stage.ts` (partitioned evidence input), `prompts/claimboundary.prompt.md`.

Overlap is real but manageable — different sections of the same files.

**c. Merge conflict risk with 3-4 items in same sprint?**

MEDIUM. `claimboundary-pipeline.ts` is 4099 lines. All items touch different regions:
- B-1: lines ~3355-3604 (LLM call factory)
- B-4: lines ~1663-2138 (search loop + query generation)
- B-5: lines ~3264-3319 (verdict config building)
- B-6: lines ~394-710 (Stage 1 schema + extraction)
- B-7: lines ~174-290 (aggregation) + new code
- B-8: lines after Stage 5 (new code)

Regions are well-separated. Conflicts would be in imports/type definitions at the top of the file, not in logic. **Recommend: implement in short PRs, merge frequently, don't batch.**

### 3. SHARED SEARCH BUDGET (Amendment 3)

**a. Where would a per-claim query budget live?**

Two layers:
- **UCM config** (`PipelineConfigSchema`): `perClaimQueryBudget: number` (default 8). This is the admin-tunable max.
- **Pipeline runtime state** (`CBResearchState`): Per-claim counter tracking queries used. The state object already has `searchQueries: Array<{query, iteration, focus, ...}>` (pipeline.ts:~1967). Add a derived map: `queriesPerClaim: Map<string, number>`.

**b. Current search loop mechanics:**

Each research iteration:
1. `generateResearchQueries()` generates up to **3 queries** per LLM call (hard slice at pipeline.ts:2133)
2. Main loop runs up to **8 iterations** (maxTotalIterations=10 minus 2 reserved for contradiction)
3. Each iteration targets the claim with fewest evidence items
4. Time budget: 10 minutes (600,000ms)
5. Zero-yield break: 2 consecutive iterations with no new evidence

Per claim theoretical max: 3 queries/iteration × 8 iterations = **24 queries** (never reached in practice — sufficiency threshold exits early).

**c. Is "max 8 queries per claim per round" the right number?**

Based on calibration run data: the typical claim uses 6-12 queries total across all iterations (3 queries × 2-4 iterations before sufficiency). A budget of **8 queries per claim per round** is conservative but reasonable. With pro/con separation (B-4), this becomes 4 pro + 4 con = 8 total, which is approximately current usage. The contrarian queries (D5#3, max 2) would fit within this budget for most claims. **8 is the right starting value.**

### 4. B-6 AT STAGE 1 (Amendment 2)

**a. Current Stage 1 output schema:**

`Pass2AtomicClaimSchema` (pipeline.ts:394-411) produces `AtomicClaim` with 12 fields:
`id`, `statement`, `category`, `centrality`, `harmPotential`, `isCentral`, `claimDirection`, `keyEntities`, `checkWorthiness`, `specificityScore`, `groundingQuality`, `expectedEvidenceProfile`.

Note: `category` already has `"factual" | "evaluative" | "procedural"` which partially covers verifiability. The R1 amendment proposes a finer-grained `verifiability` field: `"verifiable" | "evaluative" | "predictive" | "vague"`.

**b. Work to add `verifiability` field:**

1. Add to `Pass2AtomicClaimSchema` Zod object (~1 line with `.catch()` default)
2. Add to `AtomicClaim` TypeScript interface (~1 line)
3. Add to `CLAIM_EXTRACTION_PASS2` prompt section (~5-10 lines of instructions)
4. Add UCM toggle `claimVerifiabilityEnabled` to PipelineConfigSchema

Total: ~2-3 hours. Genuinely LOW.

**c. Downstream readers:**

| Consumer | Current Impact | Action for v1 |
|----------|---------------|---------------|
| Gate 1 validation | Checks `specificityScore ≥ 0.6` and `checkWorthiness` | Add: log verifiability value. **Do not filter** — flag only. |
| Research stage | Targets claims by sufficiency | No change for v1. Future: different query strategies for evaluative claims. |
| Verdict stage | Sees all claims equally | No change for v1. Future: different confidence calibration for evaluative claims. |
| Report output | Shows claim details | Add verifiability to claim detail card. |

**d. Gate 1 decision point:**

**I recommend: flag-only for v1, not filter.** Reason: filtering non-verifiable claims before research changes the pipeline's analytical scope — a claim like "Was X fair?" would be classified as evaluative/non-verifiable and excluded, but it's a valid analysis target. The verifiability field should inform downstream handling (different search strategies, different hedging) rather than hard-filter.

This is a design decision that should be ratified by the Architect. Including a filter in v1 would exceed the "LOW effort" classification.

### 5. TESTING STRATEGY

**a. Test patterns per B-item:**

| Item | Test Approach | Existing Pattern? | Infrastructure Needed? |
|------|-------------|-------------------|----------------------|
| B-4 | Mock `generateResearchQueries()`, verify pro/con variants in output; mock search loop with budget cap | Yes — existing pipeline tests mock LLM calls | None |
| B-5a | Prompt change — integration test only (expensive) | N/A — prompt quality needs live LLM | None new |
| B-5b | Config resolution tests (opus tier → correct model ID) | Yes — existing `buildVerdictStageConfig` tests | None |
| B-6 | Mock Stage 1 output, verify `verifiability` field populated; verify Gate 1 flagging | Yes — existing extraction tests | None |
| B-7 | Mock reconciliation output, verify `misleadingness` field; verify field NOT in challenger input | Yes — existing verdict-stage tests | None |
| B-8 | Deterministic structural checks are pure functions — direct unit tests. Rubric eval: mock Haiku call, verify score structure. | Yes for structural checks; new pattern for eval call | None |

All items fit existing test patterns. No new test infrastructure required.

**b. Feature flags:**

All flags in UCM (config-schemas.ts):

| Flag | Config Section | Default |
|------|---------------|---------|
| `proConQuerySeparation` | Pipeline | `false` |
| `perClaimQueryBudget` | Pipeline | `8` |
| `claimVerifiabilityEnabled` | Pipeline | `false` |
| `misleadingnessEnabled` | Pipeline | `false` |
| `explanationQualityCheckEnabled` | Calculation | `false` |
| `explanationQualityRubricEnabled` | Calculation | `false` |

B-5 doesn't need a feature flag — it uses existing `debateModelTiers`/`debateProfile` configuration. The Opus tier is a new value in an existing field, not a separate toggle.

**Total: 6 new UCM flags**, all defaulting to `false` (off) for production safety.

**c. Test count impact:**

Current: 952 tests passing. Estimated additions: 28-38 new tests. Expected total: ~980-990.

### 6. INTEGRATION WITH IN-PROGRESS WORK

**a. Uncommitted work on main that conflicts?**

Checked `git status`: clean tree. The only uncommitted changes are the report-generator improvement just made in this session (significance notice root causes). This touches `report-generator.ts` which none of B-4 through B-8 modify.

**b. Phase 1 (A-1/A-2/A-3) file overlap:**

Phase 1 is **complete** (A-1, A-2 implemented; A-3 gate executed with NO-GO). The A-series commits are merged to main. No ongoing Phase 1 work conflicts with B-items.

However: A-3 gate retry (after credit replenishment) will need another calibration run. This doesn't conflict with code changes but means the runner/calibration code should remain stable during the retry window.

**c. Should any B-items wait until after Phase 1?**

Phase 1 is effectively complete (code-wise). The only remaining Phase 1 work is A-3 gate retry (operational, not code). All B-items can start now.

**However:** B-5b (Opus tier) and B-4 (pro/con queries) will change pipeline behavior. If A-3 gate retry happens on the same branch, these changes would alter calibration results. **Recommendation: tag current main before starting B-items so A-3 retry can use the stable codebase if needed.**

---

## Implementation Concerns

### 1. `claimboundary-pipeline.ts` Is the Bottleneck

This file is 4099 lines and gets touched by every B-item plus B-1. Even though each item touches different line ranges, the cumulative risk is:
- Import conflicts at the top (all items add imports)
- Type parameter changes to shared functions
- Test file mirroring the same structure

**Mitigation:** Implement B-items sequentially on main with immediate merge. Do NOT branch 5 items in parallel and merge later — that's a guaranteed conflict nightmare. The "parallel implementation" in the proposal should mean "parallel in calendar time by different agents" not "parallel branches merged at the end."

### 2. Prompt File Coordination

`claimboundary.prompt.md` (961 lines) gets 5 changes across different sections. Each section is independent, so merge conflicts are unlikely. But prompt changes need quality validation — each change should include a manual spot-check of LLM output quality, not just unit tests.

### 3. B-5b Opus Pricing Is Understated

The R1 review correctly identifies the 77% cost increase for Opus challenger. For Opus reconciler (Amendment 1's preferred placement): the reconciler call includes ALL evidence + advocate verdicts + challenger challenges + self-consistency data — it's the largest input context in the debate pattern. Opus pricing on this call may exceed the R1 estimate. **Run a cost estimate on actual reconciler token counts before committing to Opus reconciler as default.**

### 4. B-6 `verifiability` vs Existing `category`

`AtomicClaim.category` already has `"factual" | "evaluative" | "procedural"`. The proposed `verifiability` field (`"verifiable" | "evaluative" | "predictive" | "vague"`) overlaps with `category`. This creates a confusing dual taxonomy — a claim can be `category: "factual"` but `verifiability: "vague"` if it's a factual assertion that's too imprecise to verify.

**Recommendation:** Either (a) replace `category` with a richer `verifiability` field, or (b) clearly document that `category` is the claim's nature and `verifiability` is its testability. I prefer (b) for backward compatibility, but the prompt must explicitly instruct the LLM to assess them independently.

### 5. D5#3 Contrarian Retrieval Is Not Yet Implemented

The D5 decision log approves contrarian retrieval as part of B-3. B-4's shared budget (Amendment 3) depends on contrarian queries existing. If B-4 ships before B-3, the budget framework is in place but only pro/con queries consume it. This is fine — the budget is a constraint, and having it early is better than adding it after D5#3 ships.

### 6. Feature Flag Governance

With 6 new UCM flags (all defaulting to off), there's a risk of "flag debt" — features implemented but never enabled. **Each flag should have a named owner and a target enable-date.** The B-2 conclusion memo should explicitly cover which flags to enable and in what order.

---

## Recommended Implementation Order

Accounting for code dependencies, merge conflict risk, and value delivery:

```
Week 1 (after A-3 retry window):
  1. B-5a  Challenger prompt improvement       [1 file, no conflicts, immediate value]
  2. B-6   Verifiability at Stage 1            [4 files, Stage 1 only, no overlap]
  3. B-7   Misleadingness flag                 [4 files, Stage 4 output only]

Week 2:
  4. B-4   Pro/Con queries + budget framework  [4 files, search loop, prepares for D5#3]
  5. B-5b  Opus tier support                   [5 files, type system cascade]
  6. B-8   Explanation quality check            [4-5 files, post-pipeline, cleanest last]

Then:
  B-1   Runtime role tracing                   [as planned, parallel track]
  B-3   Knowledge-diversity-lite (uses B-4's budget framework + B-6's verifiability)
  B-5c  Opus challenger+reconciler config      [trivial once B-5b ships]
  B-2   A/B conclusion memo (expanded scope)
```

**Rationale:**
- B-5a first: zero-risk prompt improvement, can be tested immediately
- B-6 and B-7 early: both are pure additions (new fields), low conflict risk, enable richer A/B comparison later
- B-4 in week 2: needs the query budget framework which is the most complex piece
- B-5b in week 2: type system cascade is mechanical but touches many files — do it after simpler items are merged
- B-8 last: depends on narrative being generated (end of pipeline), cleanest to add after other changes are stable
- B-1 on parallel track: purely additive instrumentation, can merge independently at any point

---

## Summary

The Quality Opportunity Map is sound. The R1 amendments are all correct and improve the proposals. From a code perspective:

1. **All 5 items are genuinely buildable in the proposed timeline** — no hidden complexity walls
2. **The main risk is merge conflicts in `claimboundary-pipeline.ts`** — mitigated by sequential merges, not parallel branches
3. **Feature flags are essential** — 6 new UCM toggles enable safe A/B isolation
4. **B-6's `verifiability` overlaps with existing `category`** — needs explicit design decision on taxonomy
5. **B-5b Opus cost should be validated** against actual reconciler token counts before enabling
6. **D5#3 is not yet implemented** — B-4's budget framework should be designed to accommodate it, even though D5#3 ships later in B-3

**APPROVE-WITH-AMENDMENTS:** The two additional amendments I propose:

**Amendment 6 (Lead Dev):** Implement B-items sequentially on main with immediate merge — not as parallel long-lived branches. "Parallel implementation" means calendar-time concurrency across agents, not branch-level concurrency.

**Amendment 7 (Lead Dev):** Tag current main (e.g., `pre-b-sequence`) before starting B-items, so A-3 gate retry has a stable codebase reference point if needed.
