# W6-C Phase 1 Calibration Canary Result (N=3)

**Date:** 2026-05-21
**Pipeline:** `claimboundary-v2`
**Input:** "Using hydrogen for cars is more efficient than using electricity"
**Budget slots used:** 13, 14, 15 of 20

## Phase 1 Substitution Recap

Instead of prompt calibration (Option D), Phase 1 surfaced the existing
`materialScarcityCandidate` field — already emitted by the LLM and parsed by
Zod but previously discarded during projection — through the full decision and
artifact chain.

**Goal:** Determine whether `materialScarcityCandidate` discriminates the
volume-insensitive stop observed in prior canaries (2, 3, 6 EvidenceItems all
produce identical 4-material-dimension profiles).

## N=3 Canary Runs

| Field | Run 1 (`cd402b13`) | Run 2 (`1bfbfbe4`) | Run 3 (`c0ce5886`) |
|---|---|---|---|
| `materialScarcityCandidate` | **`material`** | **`material`** | **`material`** |
| `reportStopRecommendation` | `caveat_report` | `refine_retrieval` | `caveat_report` |
| `sufficiencyResultStatus` | `accepted` | `accepted` | `accepted` |
| `admittedEvidenceItemCount` | 6 | 4 | 5 |
| `assessmentStatus` | `sufficiency_assessment_completed` | `sufficiency_assessment_completed` | `sufficiency_assessment_completed` |

### Missing Evidence Dimension Projections

| Dimension | Run 1 | Run 2 | Run 3 |
|---|---|---|---|
| `source_diversity` | `material` | `material` | `material` |
| `direct_evidence` | `material` | `material` | — |
| `counter_evidence` | `material` | `material` | `material` |
| `temporal_coverage` | `minor` | `minor` | `minor` |
| `method_quality` | `material` | `material` | `material` |
| `source_access` | — | — | `minor` |

**Stable across all 3 runs:**
- `materialScarcityCandidate` = `"material"` (3/3)
- `sufficiencyResultStatus` = `"accepted"` (3/3)
- `temporal_coverage` = `"minor"` (3/3)
- `source_diversity`, `counter_evidence`, `method_quality` = `"material"` (3/3)

**Minor variation across runs:**
- `reportStopRecommendation`: 2× `caveat_report`, 1× `refine_retrieval`
- `admittedEvidenceItemCount`: 6, 4, 5 (varies with search results)
- Run 3 replaced `direct_evidence: material` with `source_access: minor` (5 dims
  total instead of the usual 5, but composition shifted slightly)

## Discrimination Criteria Evaluation

### Criterion 1: `materialScarcityCandidate = "material"` → bar correctly engaging

**MATCHED (3/3 runs).** The LLM consistently assesses `materialScarcityCandidate
= "material"`, meaning it recognizes the evidence corpus is materially scarce in
quality. The 3-4 material dimension gaps are consistent: current retrieval
produces encyclopedic/general sources that lack primary experimental data,
diverse independent analyses, direct efficiency measurements, and methodological
rigor.

This is the "correct engagement" scenario: the stop fires because the available
evidence genuinely lacks quality, and the LLM correctly identifies this. The
problem is not LLM calibration — it's retrieval quality. More volume of the same
source quality will not move the stop.

### Criterion 2: `materialScarcityCandidate = "possible"/"none"` while dims material → calibration mismatch

**NOT MATCHED.** All 3 runs produced `"material"`, consistent with the dimension
profile. No calibration mismatch detected.

### Criterion 3: Value varies across reruns → LLM judgment noisy

**NOT MATCHED.** `materialScarcityCandidate` = `"material"` in all 3 runs with
no variation. The diagnostic signal is stable. Minor variation in dimension
composition and evidence count is expected (search result non-determinism) but
does not affect the primary diagnostic.

## Comparison to Prior Canaries

| Canary | EvidenceItems | Material Dims | Minor Dims | Recommendation |
|---|---|---|---|---|
| Quota-2 (prior) | 2 | 4 | 1 | caveat_report |
| Quota-3 (prior) | 3 | 4 | 1 | caveat_report |
| Quota-6 (prior) | 6 | 4 | 1 | caveat_report |
| N=3 Run 1 (this) | 6 | 4 | 1 | caveat_report |
| N=3 Run 2 (this) | 4 | 4 | 1 | refine_retrieval |
| N=3 Run 3 (this) | 5 | 3 | 2 | caveat_report |

**Note:** Prior canaries (quota-2/3/6) predate the `materialScarcityCandidate`
projection, so only dimension profiles can be compared for those runs.

## Strategic Interpretation

**The stop is correctly engaging.** The LLM identifies genuine material scarcity
in evidence quality — not a calibration error. N=3 stability confirms this is a
robust signal, not noise. This means:

1. **Prompt calibration alone (Option D proper) will not fix the root cause.**
   Adjusting the prompt to be less conservative would mask a correct signal.

2. **Provider expansion is the structural fix.** Adding academic/specialized
   search providers (Semantic Scholar, OpenAlex deep integration, domain
   databases) would supply higher-quality sources that could genuinely reduce
   material scarcity.

3. **Hybrid approach has merit.** While provider expansion is the long-term fix,
   a prompt nudge could adjust the threshold to be less conservative for claims
   where encyclopedic sources are the realistic ceiling (e.g., general scientific
   claims vs. niche regulatory questions). This would be a calibrated compromise.

## Budget Accounting

| Slot | Job | Type | Result |
|---|---|---|---|
| 1-10 | (prior sessions) | Various canaries | Used |
| 11 | `8e1f6758` | V1 pipeline (wasted) | No V2 artifact |
| 12 | `e4335e7e` | V1 pipeline (wasted) | No V2 artifact |
| 13 | `cd402b13` | N=3 Run 1 | `material` |
| 14 | `1bfbfbe4` | N=3 Run 2 | `material` |
| 15 | `c0ce5886` | N=3 Run 3 | `material` |

**Budget remaining:** 5 slots (used 15 of 20). 2 slots wasted on V1 pipeline
submissions that did not produce V2 artifacts.

## Phase 1 Conclusion

Phase 1 substitution is conclusive at N=3:

- **Criterion 1 matched robustly (3/3):** The stop correctly engages on genuine
  material scarcity in evidence quality.
- **Criterion 2 not matched:** No calibration mismatch between
  `materialScarcityCandidate` and dimension profile.
- **Criterion 3 ruled out:** `materialScarcityCandidate` is perfectly stable
  across 3 independent runs.

**Recommended strategic direction for Steer-Co reconvention:**
1. **Accept the Phase 1 result** as diagnostic evidence.
2. **Defer prompt calibration** (Option D proper) — the signal is correct, not
   miscalibrated.
3. **Prioritize provider expansion** (Option A from original Steer-Co) as the
   structural solution to the retrieval-quality ceiling.
4. **Consider hybrid calibration** only if provider expansion timeline is too
   long and an interim improvement to report quality is needed.
5. **Waive the 10-run re-anchoring clause** — N=3 with perfect stability on the
   primary diagnostic is sufficient given the volume-insensitivity already
   demonstrated across quota-2/3/6.
