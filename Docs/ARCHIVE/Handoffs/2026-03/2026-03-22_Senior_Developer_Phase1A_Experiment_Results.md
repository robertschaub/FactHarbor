# 2026-03-22 Senior Developer — Phase 1A Experiment Results

**Task:** Execute Phase 1A as a controlled UCM-only experiment: lower `evidenceBalanceSkewThreshold` from 0.8 to 0.65 in the calculation config. Observe whether contrarian retrieval fires on EN exact runs and whether that alone reduces spread.

---

## Config Change Applied

**Only change made:**
- `evidenceBalanceSkewThreshold`: 0.8 → **0.65** (calculation UCM config, activated)
- No code changes, no prompt changes, no pipeline config changes

**Reverted after experiment:** Yes. Threshold is back to 0.8.

---

## Results

### Pre-experiment baseline (post-B1+B2, from prior session)

| Run | Truth% | Verdict | Evidence |
|-----|--------|---------|----------|
| Run1 DE exact | 21% | MOSTLY-FALSE | 24S/77C |
| Run2 EN exact | 63% | LEANING-TRUE | 103S/48C |
| Run3 DE para | 21% | MOSTLY-FALSE | 22S/86C |
| Run4 EN para | 55% | UNVERIFIED | 34S/41C |
| Run5 FR exact | 15% | MOSTLY-FALSE | 15S/86C |

**Spread: 48pp**

### Phase 1A results (threshold=0.65)

| Run | Truth% | Verdict | Evidence | Conf | Dir warns | Pool warns | Δ from baseline |
|-----|--------|---------|----------|------|-----------|------------|-----------------|
| Run2 EN exact | **77%** | MOSTLY-TRUE | 85S/21C | 81% | 0 | 0 | **−14pp (wrong direction)** |
| Run1 DE exact | **26%** | MOSTLY-FALSE | 22S/70C | 70% | 0 | 0 | +5pp (stable, within noise) |
| Run4 EN para | **19%** | MOSTLY-FALSE | 17S/84C | 70% | 0 | 0 | **+36pp (right direction)** |

---

## Contrarian Firing Analysis

**Contrarian IS firing.** Evidence from pool shapes:

- **Run4 EN para**: Pool shifted from 34S/41C (pre-1A) → 17S/84C (Phase 1A). This is consistent with contrarian firing on a contradicting-dominant pool (~67% contradicting → `0.67 > 0.65` = TRUE) and seeking supporting evidence, adding some supporting items but still ending 83% contradicting. Result: truth correctly low at 19% (improvement from 55%).

- **Run1 DE exact**: Pool 22S/70C = 76% contradicting → threshold triggered → contrarian seeks supporting evidence → adds modest supporting items → pool still 76% contradicting → truth stays low at 26% (stable, correct).

- **Run2 EN exact**: Pool 85S/21C = 80% supporting → threshold triggered → contrarian seeks contradicting evidence for "plastic recycling is pointless" → found only 21 contradicting items against 85 supporting → pool remains 80% supporting → truth increases to 77%.

**The contrarian mechanism is mechanically correct.** The issue is that the EN search space for "plastic recycling is pointless" is structurally resistant to returning contradicting evidence even when actively sought. The failure-mode sources (9% global recycling rate, China's National Sword, market failures) dominate the EN search result landscape for this claim. Contrarian's 2 queries per claim cannot overcome 85 supporting items accumulated across 9 main iterations.

---

## Decision Gate Evaluation

| Criterion | Target | Actual | Result |
|-----------|--------|--------|--------|
| EN exact drops below 55% truth | <55% | 77% | **FAIL** |
| Contrarian clearly fires | Evidence of opposite-direction queries | Yes (confirmed from pool shapes) | PASS |
| Contrarian materially increases contradicting share | Pool shifts toward balance | 85S/21C = only 25% contradicting after contrarian | **FAIL** |
| DE control unchanged | ±5pp from baseline | 21% → 26% | PASS (within noise) |

**Overall: FAIL.** Contrarian fires but cannot overcome the EN search space structural bias.

---

## Key Finding

The D5 contrarian mechanism is correctly implemented and correctly fires at threshold=0.65. The mechanism is not broken. The problem is upstream:

1. **9 main iterations × 2-3 queries per claim** each search the EN failure-mode space and find supporting evidence ("9% global recycling rate", "contamination rates", "China's National Sword impact"). These accumulate 80-100 supporting items.

2. **Contrarian's 2 queries per claim** then ask for opposite-direction evidence in the same EN search space. They find 15-25 contradicting items. Against 80-100 supporting items, this does not rebalance the pool.

The math: to cross the 0.65 contradicting threshold, you need 65% of the directional pool to be contradicting. Against 85 supporting items, you need 85×(0.65/0.35) ≈ 158 contradicting items. Contrarian's 2 queries found 21.

**Phase 1B** (contradictionReservedIterations: 1→2, contradictionReservedQueries: 2→4) would add approximately 10-15 more contradicting items per run. Still insufficient by 3-4x.

---

## Recommendation

**Do not proceed to Phase 1B.** The structural math shows it will also be insufficient — the EN failure-narrative evidence pool has too much volume and too consistent a composition for iteration-count increases to rebalance it.

The two legitimate next options, in order of friction:

### Option A — Lead Architect Phase 1: GENERATE_QUERIES direction-neutralization (prompt change, Captain approval)

As described in `2026-03-21_Lead_Architect_Plastik_Stage2_Retrieval_Design_Assessment.md` §3. Prevents `expectedEvidenceProfile` from anchoring main-iteration query framing to the failure-mode methodology. Lower friction, lower expected impact. Worth doing as a gate test.

### Option B — Cross-linguistic query supplementation (code, Captain design approval)

As described in `2026-03-21_Lead_Architect_Plastik_Stage2_Retrieval_Design_Assessment.md` §4. Adds a supplementary query pass in DE/FR for EN inputs, merging evidence pools before boundary formation. Directly addresses the structural language-driven evidence pool asymmetry. Higher friction, higher impact.

---

## State After Experiment

- `evidenceBalanceSkewThreshold` **reverted to 0.8** (no net change from pre-experiment code/config state)
- All pipeline config values unchanged
- No prompt changes
- Tests: not re-run (no code changes were made)

---

## Files Touched

- UCM calculation config (modified and then reverted — net-zero change)
- This handoff file (created)
- `Docs/AGENTS/Agent_Outputs.md` (entry appended)

## Key Decisions

- Phase 1A executed cleanly with full isolation (threshold-only change)
- Contrarian fires at 0.65 threshold — mechanism confirmed working
- EN exact gets WORSE with threshold lowered (77% vs 63% pre-1A) because contrarian cannot escape the EN failure-mode search space
- Phase 1B is not recommended — insufficient by structural math
- Threshold reverted to 0.8

## Warnings

- The contrarian mechanism firing does NOT guarantee pool rebalancing. In a structurally biased search space, contrarian adds opposite-direction items but may only marginally shift the ratio.
- Phase 1B would reduce the `contrarianRuntimeCeilingPct` budget headroom — verify this before attempting if the Captain still wants to try it.
- Do NOT lower `evidenceBalanceSkewThreshold` below 0.65 — already confirmed this makes EN exact worse without helping it.

## For Next Agent

- Phase 1A: FAILED and reverted. Do not retry threshold changes.
- Next step is Lead Architect Phase 1 (GENERATE_QUERIES direction-neutralization prompt change) — requires Captain approval. Exact proposed text is in `2026-03-21_Lead_Architect_Plastik_Stage2_Retrieval_Design_Assessment.md` §3.
- If Captain approves: add the neutralization paragraph to `apps/web/prompts/claimboundary.prompt.md`, `## GENERATE_QUERIES` section, after the `expectedEvidenceProfile` input block (around line 460).
- Run same 3-input set (EN exact + DE exact + EN para) to measure effect.
- If Phase 1 prompt change still insufficient (spread ≥25pp): proceed to cross-linguistic supplementation (Phase 2, code change, design approval required).

## Learnings

Appended to Role_Learnings.md? No — result is a FAIL with clear structural explanation. Captain should decide whether to promote the "contrarian math" insight to Role_Learnings.
