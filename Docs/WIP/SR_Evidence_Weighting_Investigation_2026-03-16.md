# SR Evidence Weighting — Investigation & Findings

**Created:** 2026-03-16
**Status:** Fix shipped (`a01577d8`), validation pending
**Trigger:** TP regression observed across all claims from Mar 12 onward

---

## 1. Root Cause

Commit `9550eb26` (Mar 12) wired `applyEvidenceWeighting()` into the verdict pipeline. The weighting formula at `source-reliability.ts:736`:

```
adjustedTruth = 50 + (truthPercentage - 50) * avgWeight
adjustedConfidence = confidence * (0.5 + avgWeight / 2)
```

With `unknownSourceScore = 0.45` (UCM `calc.sourceReliability.defaultScore`), unevaluated sources were treated as below-average. Since most sources in a typical analysis lack SR evaluations, this compressed TP toward 50% and slashed confidence by ~27% across the board.

**Measured impact:**

| Claim family | Pre-SR avg (Mar 1-11) | Post-0.45 avg (Mar 12-16) | Delta |
|-------------|----------------------|--------------------------|-------|
| Bolsonaro EN | 72 | 55 | **-17pp** |
| Iran EN | 84 | 66 | **-18pp** |
| Bolsonaro PT | 67 | 57 | **-10pp** |
| DE Mental Health | 64 | 64 | 0 (was already near 50, less pull) |

## 2. Fix Applied

**Commit `a01577d8`:** Changed `defaultScore` from `0.45` to `null`.

When `defaultScore = null`:
- Unevaluated sources return `null` weight → excluded from average
- `avgWeight` is calculated from only sources with real SR evaluations
- Verdicts backed entirely by unevaluated sources → returned unchanged (`weights.length === 0`)

Changes across 5 files:
- `config-schemas.ts`: Zod schema `.nullable()`, TS default `null`
- `calculation.default.json`: `null`
- `config-snapshots.ts`: type `number | null` (3 locations)
- `quality-gates.ts`: Gate 4 aligned — excludes unevaluated sources from average
- `source-reliability.ts`: removed dead `.filter()` at line 710

## 3. Validation (pending)

3 benchmark claims submitted:
- Bolsonaro EN — target: TP ≥65 (recovery from 55 toward 72)
- Bolsonaro PT — target: TP ≥62 (recovery from 57 toward 67)
- DE Mental Health — target: TP remains ~64-70 (no regression)

## 4. Architectural Observations

### 4.1 avgWeight is per-verdict, not global

`avgWeight` is computed from only the `supportingEvidenceIds` of each claim verdict. Two claims in the same analysis can get very different weights depending on which evidence items the LLM cited. This amplifies run-to-run variance because evidence citation is non-deterministic.

### 4.2 Supporting-only asymmetry

The weighting formula only uses supporting evidence sources — contradicting evidence sources are ignored. This creates a directional bias: verdicts backed by low-reliability supporting sources are penalized more than they should be if the contradicting sources are also low-reliability.

**Status:** Tracked as a known issue, not blocking. The asymmetry pre-dates the regression.

### 4.3 Triangulation and derivative factors

Both are deterministic heuristics making analytical judgments about evidence quality/claim relationships — which should be LLM-powered per AGENTS.md "LLM Intelligence" mandate. They were likely added before the mandate was formalized. Low-magnitude impact (additive/multiplicative factors near 1.0), but worth reviewing.

**Status:** Flagged for future review under LLM Intelligence mandate.

### 4.4 Wikipedia SR scores

Wikipedia domains (en/de/fr/es.wikipedia.org) score 38-42% in SR evaluations. The SR evaluation criteria over-weight traditional editorial structures (editorial board, peer review) and under-weight crowdsourced quality mechanisms (revision history, citation requirements, vandalism patrol). Wikipedia evidence is therefore penalized even when SR cache is warm.

**Status:** SR evaluation prompt quality issue. Track separately.

---

## 5. Postponed Topics

| Topic | Description | Tracking |
|-------|-------------|----------|
| **SR weighting formula asymmetry** | Only `supportingEvidenceIds` are weighted; contradicting evidence ignored. Should use net-reliability. | Backlog |
| **Per-verdict avgWeight non-determinism** | LLM-selected evidence IDs vary run-to-run → different avgWeights for same claim. Consider weighting all evidence items. | Backlog |
| **Triangulation/derivative factor review** | Deterministic heuristics making analytical judgments. Review under LLM Intelligence mandate. | Backlog |
| **Wikipedia SR scoring** | SR evaluation under-scores Wikipedia. Prompt quality issue. | Backlog |
| **INTERRUPTED recovery test coverage** | The INTERRUPTED→QUEUED restart path has no integration test. | Backlog |

---

## 6. Truth Percentage — Full Input Map

The final report TP is built in 4 layers, each with its own inputs:

### Layer 1: Per-claim TP (LLM-determined)

The verdict debate LLM outputs `truthPercentage` directly as a number 0-100 based on the evidence pack. This is the **primary signal** — everything else modifies it.

**Code:** `verdict-stage.ts:509` (`parseAdvocateVerdict`)

### Layer 2: Self-consistency spread adjustment (LLM + deterministic)

Two additional LLM calls at `selfConsistencyTemperature: 0.4` re-evaluate the same evidence. The spread between the 3 TPs adjusts **confidence** (not TP directly):
- Tight spread (≤15pp) → confidence preserved
- Wide spread (>25pp) → confidence reduced

**Code:** `verdict-stage.ts:383` (`applySpreadAdjustment`)

### Layer 3: SR evidence weighting (deterministic)

Adjusts both TP and confidence per-claim based on `avgWeight` of supporting evidence sources:
- `adjustedTruth = 50 + (TP - 50) * avgWeight`
- `adjustedConfidence = confidence * (0.5 + avgWeight / 2)`

**Inputs:** `trackRecordScore` per source domain (SR evaluation), `unknownSourceScore` (UCM config, now `null`).

**Code:** `source-reliability.ts:736` (`applyEvidenceWeighting`)

### Layer 4: Weighted claim aggregation (deterministic)

Per-claim TPs are weighted-averaged into the final report TP:

```
weight = centrality × harm × confidence × (1 + triangulation) × derivative × probative
```

| Factor | Source | What it does |
|--------|--------|-------------|
| **centrality** | LLM (Pass 2 `isCentral`) | Central claims weighted higher |
| **harm** | LLM (Pass 2 `harmPotential`) | Critical/high harm claims weighted higher |
| **confidence** | Layer 2 output | Low-confidence claims weighted less |
| **triangulation** | Deterministic (unique domain count) | Claims with diverse sources weighted higher |
| **derivative** | Deterministic (evidence ID overlap) | Redundant claims weighted less |
| **probative** | LLM (extraction `probativeValue`) | Claims backed by high-probative evidence weighted higher |
| **thesisRelevance** | LLM (Pass 2) | `tangential`/`irrelevant` → weight = 0 |
| **counter-claim flip** | LLM (Pass 2 `claimDirection`) | `contradicts_thesis` → TP inverted (100 - TP) |

**Code:** `claimboundary-pipeline.ts:5540-5617` (`aggregateAssessment`)

### Summary: LLM vs deterministic

| Input | Determined by | Layer |
|-------|--------------|-------|
| Raw TP per claim | **LLM** (verdict debate) | 1 |
| Spread/stability | **LLM** (self-consistency re-runs) | 2 |
| probativeValue per evidence | **LLM** (extraction) | 1, 4 |
| SR track record score | **LLM** (SR evaluation) | 3 |
| unknownSourceScore | **UCM config** (now `null`) | 3 |
| centrality, harm, claimDirection, thesisRelevance | **LLM** (Pass 2 extraction) | 4 |
| triangulation, derivative | **Deterministic** (evidence metadata) | 4 |
| confidence factor | **Deterministic** (from Layer 2 output) | 4 |

SR weighting (Layer 3) is the only post-verdict deterministic adjustment that moves TP itself. Everything else either feeds into the LLM's verdict or adjusts the aggregation weight.

---

## 7. Related Documents

- `Docs/WIP/Combined_Claim_and_Boundary_Quality_Remediation_Plan_2026-03-16.md`
- `Docs/WIP/Report_Quality_Criteria_Scorecard_2026-03-12.md`
- `Docs/WIP/LLM_Model_Allocation_Review_2026-03-15.md`
