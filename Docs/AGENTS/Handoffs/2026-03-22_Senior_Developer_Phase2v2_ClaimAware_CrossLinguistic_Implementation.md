# 2026-03-22 Senior Developer — Phase 2 v2: Claim-Aware Cross-Linguistic Implementation

**Task:** Implement Phase 2 v2 — claim-aware cross-linguistic supplementation using contrarian supplementary queries. Replaces Phase 2 v1 (claim-unaware pool mixing with "main" iterationType that caused 74%→24% confidence collapse).

---

## Implementation Summary

### Root Cause Addressed

Phase 2 v1 used `iterationType: "main"` for the supplementary pass. Main queries follow `expectedEvidenceProfile` seeded by the primary loop's methodology — for EN inputs this returns directionally mixed evidence. When DE supplementary evidence landed unevenly across claims (AC_01 65%, AC_02 50%, AC_03 32%), inter-claim spread exceeded `maxConfidenceSpread: 25` → `reductionFactor: 0.5` halved aggregate confidence from 74% to 24%.

**Phase 2 v2 fix:** `iterationType: "contrarian"` generates queries seeking evidence OPPOSITE to the current pool majority, producing uniform directional supplementation across all claims.

**New gate:** Pool balance check before firing. If `majorityRatio ≤ supplementarySkewThreshold`, the pool is already balanced and the pass is skipped. Empty pool → `majorityRatio=1.0` → always fires.

**Budget fix:** Changed `maxSourcesPerIteration` (up to 8) → `suppQueriesPerClaim` (2). Correctly bounds the contrarian pass to its quota.

---

### Files Changed

| File | Change |
|------|--------|
| `apps/web/configs/pipeline.default.json` | Added `supplementarySkewThreshold: 0.55` |
| `apps/web/src/lib/config-schemas.ts` | Added `supplementarySkewThreshold` field, transform default, DEFAULT_PIPELINE_CONFIG entry |
| `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` | Step 3.5 rewritten: `"main"` → `"contrarian"`, pool balance gate, `maxSourcesPerIteration` → `suppQueriesPerClaim` |
| `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts` | Updated existing "runs" test to assert `iterationType: "contrarian"`; added 2 new tests (balanced pool → skip, skewed pool → contrarian fires) |

### Key Code Changes (Step 3.5 in `claimboundary-pipeline.ts`)

1. **Pool balance gate** — inline calculation (not `assessEvidenceBalance` — that returns `isSkewed=false` for empty pool via NaN condition):
   ```typescript
   const majorityRatio = directionalTotal > 0
     ? Math.max(supportingCount, directionalTotal - supportingCount) / directionalTotal
     : 1.0; // empty pool → treat as fully skewed, always fire
   ```
2. **Contrarian iterationType** — `"main"` → `"contrarian"` in `runResearchIteration` call
3. **Budget bound** — `maxSourcesPerIteration` → `suppQueriesPerClaim` (2) as 5th argument to `runResearchIteration`

### New UCM Config Fields

```json
"supplementarySkewThreshold": 0.55
```
(Note: placed in pipeline config, not calculation config as design doc specified — `researchEvidence()` only loads pipeline + search configs, not calculation config. Documented deviation.)

---

## Verification

- `npm test` — `claimboundary-pipeline.test.ts`: **296 tests passing** (6 cross-linguistic tests including 2 new ones)
- `config-drift.test.ts`: **4/4 passing** (JSON ↔ TS sync confirmed)
- `npm run build` — **clean** (no TypeScript errors)
- UCM activated: `crossLinguisticQueryEnabled=true`, `supplementarySkewThreshold=0.55` at `2026-03-22T13:16:21.859Z` (hash: `0294f8a1...`)

---

## Test Coverage Added

| Test | What it verifies |
|------|-----------------|
| Updated: "runs and uses supplementary language" | `iterationType: "contrarian"` is passed to GENERATE_QUERIES |
| New: "skipped when pool majority ratio does not exceed threshold" | 3 supports + 3 contradicts → ratio=0.5 ≤ 0.55 → mockSearch NOT called |
| New: "uses contrarian iterationType for skewed pool" | 5 supports + 1 contradicts → ratio=0.833 > 0.55 → fires + `iterationType: "contrarian"` asserted |

---

## Validation Runs Required

Six-input batch (activate UCM before starting):

| Input | Lang | Expected direction | Baseline (pre-Phase2) |
|-------|------|-------------------|-----------------------|
| "Plastic recycling is pointless" | EN | LEANING-FALSE | 63% / 74% |
| "Plastik recycling bringt nichts" | DE | MOSTLY-FALSE | 21% / 77% |
| "Plastic recycling brings no real benefit." | EN para | LEANING-FALSE | 55% / — |
| "Le recyclage du plastique ne sert à rien" | FR | MOSTLY-FALSE | 15% / 73% |
| Hydrogen smoke input | EN | LEANING-TRUE | ~65% / HIGH |
| Bolsonaro smoke input | PT/EN | UNVERIFIED/MF | per baseline |

**Gate criteria (all must pass):**
- EN exact conf ≥ 50% (Phase 2 v1 collapse: 24%)
- FR exact conf ≥ 50% (Phase 2 v1 collapse: 24%)
- EN para truth direction correct (↓ from 55% or stable LEANING-FALSE)
- Spread EN exact vs DE exact / FR exact ≤ 35pp (v1 worst: 47pp)
- Smoke inputs unchanged ± 5% truth, ±15% conf

---

## State After Implementation

- `crossLinguisticQueryEnabled`: **true** (UCM active, activated 2026-03-22T13:16:21.859Z)
- `supplementarySkewThreshold`: **0.55** (new UCM field, active)
- Code: Phase 2 v2 implemented + tested
- Phase 2 v1 code: **replaced** in Step 3.5 (not kept — v2 is a direct replacement in same code location)

---

## Key Decisions

- `supplementarySkewThreshold` in pipeline config (not calculation) — deviation from design doc, forced by `researchEvidence()` loading scope
- Empty pool → `majorityRatio=1.0` (always fires) — inline calculation, not `assessEvidenceBalance` which mishandles empty pool
- `suppQueriesPerClaim` (2) as budget cap replaces `maxSourcesPerIteration` (up to 8) — prevents overrun

## Warnings

- `assessEvidenceBalance()` (line 4578) returns `isSkewed=false` for empty pool due to `!isNaN(balanceRatio)` NaN guard. **Do not reuse it** for the supplementary gate — the inline `majorityRatio` calculation is correct.
- `contrarianMaxQueriesPerClaim` from calculation config is NOT accessible inside `researchEvidence()`. Budget controlled via `suppQueriesPerClaim` from pipeline config.
- Gate 4 `contextConsistency` (`maxConfidenceSpread: 25 / reductionFactor: 0.5`) remains unchanged — correctly working.

## For Next Agent

- Validation batch not yet run — UCM is active, run the 6-input set above
- Success criteria: confidence recovery on EN/FR (≥50%), spread reduction, smoke inputs stable
- If validation passes → update handoff + Agent_Outputs.md; commit Phase 2 v2 changes
- If validation fails → diagnose per-boundary claim spread before adjusting threshold or approach
