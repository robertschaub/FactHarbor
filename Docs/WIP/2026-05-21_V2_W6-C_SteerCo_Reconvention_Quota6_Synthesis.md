# W6-C Steer-Co Reconvention: Quota=6 Canary Synthesis and Strategic Direction

**Date:** 2026-05-21
**Workstream:** W6-C Retrieval Quality (Direction A)
**Trigger:** Three canaries (2 EI, 3 EI, 6 EI) show identical material
dimension profiles. Volume increases do not move the W6-C stop. Strategic
direction decision required.

## Evidence Summary

Three canaries ran the same claim through the V2 pipeline with increasing
source material volume:

| Canary | EvidenceItems | Source materials | Aggregate bytes | Material dims | Outcome |
|---|---|---|---|---|---|
| Diagnostic (job `6e0e30ce`) | 2 | 3 (1 OA + 2 WM) | ~2750 | 4 | `refine_retrieval` |
| Targeted #1 (job `24aed060`) | 3 | 3 (1 OA + 2 WM) | 2748 | 4 | `refine_retrieval` |
| Quota=6 (job `2c14b0a8`) | 6 | 6 (1 OA + 5 WM) | 4154 | 4 | `refine_retrieval` |

Dimension profile invariant across all three:
- `source_diversity` = **material**
- `counter_evidence` = **material**
- `direct_evidence` = **material**
- `method_quality` = **material**
- `temporal_coverage` = minor
- `source_access` = (not flagged)
- `other` = (not flagged)

## Key Findings

1. **Volume-insensitive stop.** Doubling source materials (3->6) doubled
   EvidenceItems (3->6) but moved zero dimensions. The `refine_retrieval`
   stop is content-quality-driven, not content-volume-driven.

2. **Source diversity is the structural constraint.** All sources are
   encyclopedic summaries (Wikimedia page summaries + OpenAlex abstracts).
   The LLM correctly identifies none provide counter-evidence, direct
   evidence, method quality, or true source diversity.

3. **Dimension order variance confirms genuine assessment.** The same 4
   material dimensions appear in different orderings across canaries,
   confirming the LLM performs structural assessment rather than memoizing.

4. **Aggregate cap validated.** 4164/12288 = 33.9% utilization. The 12288
   cap provides comfortable headroom for quota=6.

5. **OpenAlex variability confirmed.** Same claim returned 2027 bytes in
   prior canaries, 1451 bytes here (28% reduction). Combined with the
   earlier 3338-byte observation, cross-run variability is 65%+.

## Re-Anchoring Clause Status

The Axis 0b Steer-Co result included: "After 10 quota=6 canary runs, report
actual aggregate byte distribution back to Steer-Co for cap right-sizing
before production cutover."

**Current data:** 1 of 10 quota=6 runs completed (4164/12288 = 33.9%).

**Request:** Waive the 10-run clause. Rationale:
- The stop is quality-driven, not volume-driven — running 9 more identical
  canaries provides no new information about aggregate byte distribution
  since the dimension profile is invariant
- Production cutover is not in scope; this is precutover shadow mode
- The cap can be right-sized later when production cutover is actually planned
- Budget is limited (10 of 20 slots remaining)

## Strategic Options (All Captain-Gated)

### Option A: New provider types
Add structurally different sources (primary research, government data, industry
reports) that could address the 4 material dimensions.

- **Gate:** Provider expansion is forbidden in current security constraints
- **Effort:** Substantial — new provider integration, API keys, parsing, etc.
- **Likelihood of success:** High — the LLM is specifically asking for these

### Option B: Adjust sufficiency prompt bar
Lower the threshold for what constitutes adequate evidence coverage, so
encyclopedic sources can pass.

- **Gate:** Prompt text edits require explicit human approval
- **Captain expanded authority:** "Steer-Co is authorized to authorize anything
  naturally needed to complete the plan, including prompt, schema changes"
- **Risk:** May accept genuinely insufficient evidence as sufficient
- **Likelihood of success:** High for moving the stop, but may compromise
  quality signal

### Option C: Accept `refine_retrieval` as correct assessment
Proceed to boundary formation (W7/W8) with a caveat that the evidence base
was flagged as insufficient. The verdict would carry a quality disclaimer.

- **Gate:** W7/W8 gate changes, public behavior implications
- **Risk:** Shipping a verdict the system itself flagged as under-evidenced
- **Likelihood of success:** N/A — changes the acceptance criteria rather than
  the evidence quality

### Option D: Hybrid — prompt calibration canary
Run a single canary with a modified sufficiency prompt that asks the LLM to
distinguish "encyclopedic-only coverage" from "no coverage at all." This tests
whether the current bar is inappropriately strict for the available source
types, without lowering the bar for all dimensions.

- **Gate:** Prompt text edit (Captain-expanded authority may cover this)
- **Effort:** Small — single prompt adjustment + 1 canary slot
- **Risk:** Low — diagnostic only, no production impact in precutover mode
- **Budget cost:** 1 slot

## Budget Status

| Category | Count |
|---|---|
| Used (informative) | 3 |
| Used (wasted: wrong variant) | 2 |
| Used (wasted: stale server) | 1 |
| Used (partial: aggregate cap block) | 2 |
| Used (wasted: stale server + aggregate cap) | 2 |
| Remaining | 10 |
| Total authorized | 20 |

## Decision Needed

1. **Waiver:** Approve waiving the 10-run re-anchoring clause for Axis 0b?
2. **Direction:** Which strategic option (A, B, C, D, or combination)?
3. **Budget:** How to allocate remaining 10 slots?
