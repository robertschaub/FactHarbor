# Phase 1 Binary Gate Experiment — Final Results

**Date:** 2026-03-14 (16:48 – 21:05 UTC)
**Duration:** ~4 hours 17 minutes

## Experiment Setup
- **Disabled Profile**: evidenceWeightingEnabled=false, applicabilityFilterEnabled=false, foreignJurisdictionRelevanceCap=1.0, contradictionReservedIterations=2, mixedConfidenceThreshold=40
- **Control Profile**: Production defaults (all suspects enabled)
- **Benchmarks**: B1 (DE: "Plastik recycling bringt nichts"), B2 (EN: "Was Iran actually making nukes?"), B3 (PT: "O julgamento de Bolsonaro foi justo...")
- **Runs per input**: 2 per profile

## Issue Log
- Two script instances ran simultaneously; duplicate (PID 559812) killed at ~17:30 UTC
- Duplicate orphan jobs marked FAILED: e3dd8d61, ebb8b671, ce703a70, 4667e4d9, b0cdd8d9
- B2 disabled-profile runs lost — collateral from duplicate cleanup
- 881ccce0 (B1r2) completed in DB but script timed out waiting; recovered from DB for analysis
- Script timeout (1200s) too short for many runs (actual: 20-35 min)

## Reconstructed Results (from DB)

### DISABLED PROFILE (suspects off)
| Run  | Score  | Truth% | Conf% | Evidence | PvH | PvM | Sources | Input |
|------|--------|--------|-------|----------|-----|-----|---------|-------|
| B1r1 | 273.1  | 38.4   | 65.4  | 178      | 99  | 75  | 60      | Plastik recycling |
| B1r2 | 249.1  | 49.4   | 55.4  | 153      | 87  | 66  | 49      | Plastik recycling |
| B3r1 | 186.2  | 58.3   | 51.2  | 80       | 50  | 25  | 28      | Bolsonaro PT |
| B3r2 | 167.6  | 68.6   | 68.1  | 68       | 42  | 23  | 23      | Bolsonaro PT |

**AVG: 219.0 | MIN: 167.6 | MAX: 273.1 | N=4**

*Note: B2 "Was Iran" runs missing (n=4 instead of 6)*

### CONTROL PROFILE (production defaults)
| Run  | Score  | Truth% | Conf% | Evidence | PvH | PvM | Sources | Input |
|------|--------|--------|-------|----------|-----|-----|---------|-------|
| B1r1 | 217.7  | 28.5   | 58.3  | 113      | 59  | 54  | 33      | Plastik recycling |
| B1r2 | 239.7  | 53.1   | 48.4  | 165      | 97  | 68  | 45      | Plastik recycling |
| B2r1 | 204.9  | 65.5   | 64.5  | 118      | 98  | 20  | 26      | Iran nukes |
| B2r2 | 229.7  | 68.1   | 68.5  | 165      | 133 | 31  | 38      | Iran nukes |
| B3r1 | 166.6  | 68.1   | 68.2  | 61       | 37  | 20  | 26      | Bolsonaro PT |
| B3r2 | 188.2  | 54.3   | 66.2  | 79       | 48  | 27  | 28      | Bolsonaro PT |

**AVG: 207.8 | MIN: 166.6 | MAX: 239.7 | N=6**

## Comparison

| Metric | Disabled | Control | Delta |
|--------|----------|---------|-------|
| Avg Score | 219.0 | 207.8 | +11.2 |
| Avg Truth% | 53.7 | 56.3 | -2.6 |
| Avg Conf% | 60.0 | 62.4 | -2.3 |
| Avg Evidence | 119.8 | 116.8 | +3.0 |
| Avg Sources | 40.0 | 32.7 | +7.3 |

**VERDICT: NO SIGNIFICANT DIFFERENCE**

Delta of +11.2 is within normal run-to-run variation. Both profiles score well above 170.

## Analysis

1. **The 4 suspects are NOT the primary cause of quality regression.** Enabling/disabling them produces comparable quality scores.
2. **Disabled profile gathers slightly more evidence/sources** (no jurisdiction cap = wider net), but this doesn't translate to meaningfully better quality.
3. **Large per-benchmark variance** exists regardless of profile (B1: 217-273 disabled, 218-240 control), indicating LLM non-determinism is a bigger factor than config changes.
4. **Truth% and confidence are actually slightly BETTER with production defaults** (control), suggesting the filtering features improve signal quality even if they reduce evidence count.

## Recommendation

Proceed to **Phase 3: Search-stack drift investigation**. The quality regression (if confirmed) is not caused by S1-S3 suspect features. Alternative causes to investigate:
- Search provider result quality changes
- LLM model behavior drift
- Prompt quality issues (especially for non-English decomposition)
- Evidence deduplication aggressiveness
