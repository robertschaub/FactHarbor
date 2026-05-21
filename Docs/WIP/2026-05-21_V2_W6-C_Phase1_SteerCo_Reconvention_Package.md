# W6-C Phase 1 Steer-Co Reconvention: materialScarcityCandidate N=3 Results

**Date:** 2026-05-21
**Workstream:** W6-C Retrieval Quality
**Trigger:** N=3 calibration canaries complete. `materialScarcityCandidate`
perfectly stable at `"material"` across all runs. Strategic direction decision
required.

## Steering Packet

```
STEER-CO QUESTION:
Given that N=3 canaries confirm `materialScarcityCandidate = "material"` with
perfect stability, the stop is quality-driven (not volume-driven or
miscalibrated). Should we:
(A) Prioritize provider expansion as the structural fix?
(B) Pursue hybrid prompt calibration to lower the bar for encyclopedic sources?
(C) Accept the stop as correct and ship caveat_report for this claim profile?
(D) Some combination or alternative?

Also: waive the 10-run re-anchoring clause from Axis 0b?

REQUESTED OUTPUT:
direction + budget allocation

AUTHORITY BOUNDARIES:
- Captain expanded authority: "Steer-Co is authorized to authorize anything
  naturally needed to complete the plan, including prompt, schema changes and
  job submission, up to 20 jobs budget"
- Captain: "if cost/benefit is good and Steer-Co has consent, proceed without
  Captain escalation"
- Provider expansion (new API integrations) remains Captain-gated per original
  security constraints
- Public behavior changes remain Captain-gated
- `redaction.sufficiencyResultPayloadReturned` must stay `false`

RISK / ESCALATION CHECK:
Strategic direction — requires full committee consent.

EVIDENCE INVENTORY:
- E1 | N=3 canary artifacts (cd402b13, 1bfbfbe4, c0ce5886) | materialScarcityCandidate = "material" in 3/3 runs
- E2 | N=3 dimension profiles | 3-4 material dims consistently (source_diversity, counter_evidence, method_quality always material; direct_evidence material in 2/3)
- E3 | Prior quota canaries (2, 3, 6 EI) | Identical dimension profiles — volume does not move the stop
- E4 | Phase 1 result doc | Docs/WIP/2026-05-21_V2_W6-C_Phase1_Calibration_Canary_Result.md
- E5 | Prior Steer-Co results | Direction A approved, quota increase tested, aggregate cap raised

KNOWN GAPS:
- Only 1 claim tested ("hydrogen vs electricity"). Generalizability to other claim profiles unknown.
- reportStopRecommendation varies (2x caveat_report, 1x refine_retrieval) — secondary signal is noisy even though primary diagnostic is stable.
- admittedEvidenceItemCount varies (4, 5, 6) — search result non-determinism.

FORBIDDEN ASSUMPTIONS:
- Do not assume provider expansion is quick or cheap.
- Do not assume prompt calibration would compromise quality — it depends on how the bar is adjusted.
- Do not assume the hydrogen claim is representative of all claim profiles.

OWNING WORKFLOWS:
- /steer-co (this session)
- /debt-guard for any implementation that follows

DEBT-GUARD / COMPLEXITY STATE:
- Required path: none (strategic direction only)
- Current classification: missing-capability (retrieval quality ceiling)
- Net mechanism change expected: depends on chosen direction
- Candidate retire/merge/quarantine target: W6-C diagnostic projection (per V2 Retirement Ledger)

V2 CONVERGENCE STATE:
- Scorecard impact: diagnostic data captured; direction decision enables next convergence step
- Retirement ledger rows: W6-C diagnostic projection row exists with removal trigger
- Hidden-only exception requested: no
```

## Evidence Detail

### N=3 Calibration Canary Results

| Field | Run 1 (cd402b13) | Run 2 (1bfbfbe4) | Run 3 (c0ce5886) |
|---|---|---|---|
| `materialScarcityCandidate` | **material** | **material** | **material** |
| `reportStopRecommendation` | caveat_report | refine_retrieval | caveat_report |
| `sufficiencyResultStatus` | accepted | accepted | accepted |
| `admittedEvidenceItemCount` | 6 | 4 | 5 |

### Dimension Profiles

| Dimension | Run 1 | Run 2 | Run 3 |
|---|---|---|---|
| `source_diversity` | material | material | material |
| `direct_evidence` | material | material | — |
| `counter_evidence` | material | material | material |
| `temporal_coverage` | minor | minor | minor |
| `method_quality` | material | material | material |
| `source_access` | — | — | minor |

### Discrimination Criteria Results

| Criterion | Result |
|---|---|
| #1: materialScarcityCandidate = "material" → correct engagement | **MATCHED (3/3)** |
| #2: "possible"/"none" while dims material → calibration mismatch | NOT MATCHED |
| #3: Varies across reruns → noisy | **RULED OUT (3/3 stable)** |

### Prior Canary History (volume-insensitivity evidence)

| Canary | EvidenceItems | Material Dims | Recommendation |
|---|---|---|---|
| Quota-2 | 2 | 4 | caveat_report / refine_retrieval |
| Quota-3 | 3 | 4 | refine_retrieval |
| Quota-6 | 6 | 4 | refine_retrieval |
| N=3 runs | 4-6 | 3-4 | caveat_report / refine_retrieval |

## Strategic Options for Committee Review

### Option A: Provider Expansion (Structural Fix)
Add academic/specialized search providers (Semantic Scholar, CrossRef, domain
databases) to supply primary research, experimental data, and diverse analyses.

- **Pro:** Addresses root cause. LLM is specifically asking for this quality.
- **Con:** Captain-gated (new API integrations). Substantial effort. Long timeline.
- **Authority:** Requires Captain approval for provider expansion.

### Option B: Hybrid Prompt Calibration
Adjust the sufficiency prompt to distinguish "encyclopedic-only coverage" from
"no coverage at all." Encyclopedic sources would satisfy some dimensions at a
lower bar while maintaining full rigor for others.

- **Pro:** Quick implementation. Within expanded Captain authority (prompt changes
  authorized). Could produce usable reports for encyclopedic-ceiling claims.
- **Con:** May mask a correct quality signal. Dimension-specific lowering could
  be complex to calibrate. Risk of accepting genuinely insufficient evidence.
- **Authority:** Within expanded authority ("including prompt, schema changes").

### Option C: Accept Stop as Correct
The stop correctly identifies that encyclopedic sources cannot satisfy academic
rigor dimensions. Accept `caveat_report` as the appropriate outcome for this
claim profile, proceed to boundary formation (W7/W8) with quality disclaimer.

- **Pro:** No prompt/schema/provider changes needed. Preserves integrity of
  quality signal. The report would carry a transparent quality limitation.
- **Con:** Every encyclopedic-ceiling claim gets caveat_report. Users see
  quality warnings on common general-knowledge claims. W7/W8 gate implications.
- **Authority:** W7/W8 gate changes may require Captain approval.

### Option D: Defer — Phase 1 Data Sufficient for Now
The diagnostic projection has served its purpose. The `materialScarcityCandidate`
field confirmed the stop is quality-driven. Defer strategic direction to a future
workstream with dedicated budget and scope.

- **Pro:** Preserves remaining budget. Clean stopping point.
- **Con:** W6-C remains at `refine_retrieval` indefinitely. No report improvement.

## Budget Status

| Category | Count |
|---|---|
| Used (prior sessions, slots 1-10) | 10 |
| Used (wasted V1 submissions, slots 11-12) | 2 |
| Used (N=3 canaries, slots 13-15) | 3 |
| Remaining | 5 |
| Total authorized | 20 |

## Re-Anchoring Clause Waiver Request

The Axis 0b Steer-Co result included: "After 10 quota=6 canary runs, report
actual aggregate byte distribution back to Steer-Co for cap right-sizing before
production cutover."

**Request:** Waive the 10-run clause. Rationale:
- N=3 stability test confirms the stop is quality-driven, not volume-driven
- Running 7 more identical canaries provides no new information
- Production cutover is not in scope; this is precutover shadow mode
- Budget is limited (5 remaining of 20)
- The cap can be right-sized later when production cutover is planned

## Deputy Assessment

The N=3 data is clear: the stop is correct, the diagnostic is stable, and the
root cause is retrieval quality not volume or calibration. The Phase 1
substitution (`materialScarcityCandidate` surfacing) has been a cost-effective
diagnostic — 3 canary slots for a definitive answer.

**Recommended direction:** Option C (accept stop as correct) with Option B
(hybrid calibration) as a future lever if/when encyclopedic-ceiling claims need
better report quality.

**Rationale:** The LLM is making the right call. Prompt calibration (Option B)
would make the LLM less correct to produce a more palatable output. Provider
expansion (Option A) is the structurally right answer but is out of scope for
this workstream and budget cycle. Option C respects the quality signal while
Option D is also viable if we want a clean stopping point.
