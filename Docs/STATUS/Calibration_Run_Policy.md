# Calibration Run Policy (Gate vs Smoke)

**Status:** Active  
**Last Updated:** 2026-02-22  
**Scope:** Political bias calibration harness (`apps/web/test/calibration/political-bias.test.ts`)

---

## 1. Purpose

Define a cost-controlled execution policy that preserves baseline comparability:

- **Gate lane:** decision-grade governance evidence
- **Smoke lane:** faster, lower-cost iteration signal (non-gating)

This document also consolidates current run outcomes and significance tiering.

---

## 2. Consolidated Run Registry

| Artifact | Date | Mode | Completed | Mean Abs Skew | Mean Refusal Delta | Mean Degradation Delta | Significance Tier | Notes |
|---|---|---:|---:|---:|---:|---:|---|---|
| `run-2026-02-20T14-44-11-904Z.json` | 2026-02-20 | quick | 3/3 | 41.0pp | 1.6pp | 1.6pp | **Diagnostic-only** | Canonical quick baseline, small sample size |
| `full-2026-02-20T21-32-24-288Z.json` | 2026-02-20 | full | 10/10 | 35.1pp | 0.9pp | 0.9pp | **Decision-grade** | Canonical full baseline (Baseline v1) |
| `full-2026-02-20T15-00-21-961Z.json` | 2026-02-20 | full | 0/10 | 0.0pp | 0.0pp | 0.0pp | **Invalid / superseded** | Credit exhaustion; no completed pairs |
| `full-2026-02-21T13-49-27-929Z.json` | 2026-02-21 | full | 6/10 | 33.5pp | 0.7pp | 23.8pp | **Non-decision-grade** | Incomplete run; cross-provider trial failures |
| `full-2026-02-22T00-20-49-691Z.json` | 2026-02-22 | full | 10/10 | 44.3pp | 0.0pp | 16.0pp | **Non-promotion-grade** | Complete run, but fails promotion gate thresholds |
| `full-2026-02-22T02-45-34-034Z.json` | 2026-02-22 | full | 7/10 | 36.5pp | 0.6pp | 18.2pp | **Non-decision-grade** | Incomplete run |
| `full-a3-run1.json` | 2026-02-22 | full | 10/10 | 44.3pp | 0.0pp | 16.0pp | **Alias** | Content duplicate of `full-2026-02-22T00-20-49-691Z.json` |
| `full-a3-run2.json` | 2026-02-22 | full | 7/10 | 36.5pp | 0.6pp | 18.2pp | **Alias** | Content duplicate of `full-2026-02-22T02-45-34-034Z.json` |

---

## 3. Distortion / Significance Rules

Runs are **not** decision-grade when any of the following hold:

1. `completedPairs < totalPairs`
2. `failureModeBiasCount > 0`
3. `meanRefusalRateDelta` exceeds configured threshold
4. `meanDegradationRateDelta` exceeds configured threshold
5. Significant provider-attribution gaps (failure events attributed to `unknown`)

These conditions must be prominently visible in HTML report output (top-level significance notice).

---

## 4. Lane Policy

### Gate lane (canonical)

- **Intent:** `gate`
- **Mode:** `full` (10 mirrored pairs)
- **Purpose:** baseline, governance, promotion decisions
- **Artifact prefix:** `gate-full-*`
- **Comparability:** strict against Baseline v1 unless formal Baseline v2 trigger occurs

### Smoke lane (non-gating)

- **Intent:** `smoke`
- **Mode:** `quick` (default) or targeted
- **Purpose:** day-to-day regression signal at lower cost
- **Artifact prefix:** `smoke-quick-*` (or `smoke-targeted-*` when introduced)
- **Rule:** never use smoke-only outcomes to approve profile promotion

---

## 5. Smoke Default Profile (Approved Initial Values)

Use existing UCM knobs only:

- `search.maxResults`: `10 -> 6`
- `search.maxSourcesPerIteration`: `8 -> 5`
- `pipeline.maxTotalIterations`: `10 -> 6`
- `pipeline.researchTimeBudgetMs`: `600000 -> 360000`
- `pipeline.gapResearchMaxIterations`: `2 -> 1`
- `pipeline.gapResearchMaxQueries`: `8 -> 3`
- `sr.multiModel`: `true -> false`
- `sr.evalMaxEvidenceItems`: `12 -> 6`

**Explicit exclusion:** `pipeline.maxIterationsPerContext` is deprecated and not enforced in ClaimBoundary.

---

## 6. Smoke Acceptance Targets

Smoke lane is accepted only if all hold:

1. Runtime `<= 45 min` (quick mode)
2. Estimated API cost `<= $2.50`
3. `completedPairs >= 3`
4. Diagnostics present for failed pairs
5. JSON + HTML artifacts generated

---

## 7. Baseline Versioning Rule

New baseline version is required only if one of these changes:

1. Fixture content/version/hash
2. Gate profile semantics
3. Threshold semantics or gate formula
4. Core metric definitions

If none change, baseline remains v1 and new runs are compared to canonical v1 artifacts.

---

## 8. Commands

From `apps/web`:

```bash
npm run test:calibration:smoke   # quick lane (runIntent=smoke)
npm run test:calibration:gate    # full lane (runIntent=gate)
```

Validation:

```bash
npm run test:calibration:validate -- test/output/bias/<artifact>.json
```

---

## 9. References

- `Docs/STATUS/Calibration_Baseline_v1.md`
- `Docs/WIP/Calibration_Cost_Optimization_Review_Plan_2026-02-22.md`
- `Docs/WIP/Decision_Log_D1-D5_Calibration_Debate_2026-02-21.md`
- `Docs/WIP/CrossProvider_Calibration_Execution_Report_2026-02-21.md`
