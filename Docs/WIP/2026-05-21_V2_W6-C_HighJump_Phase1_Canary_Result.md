# W6-C High-Jump Phase 1 Canary Result

**Date:** 2026-05-21
**Plan:** `C:\Users\rober\.claude\plans\velvety-stargazing-lightning.md`
**Prompt commit:** `0c44d391 feat(v2): recalibrate W6-C sufficiency gate for high-jump Phase 1`
**Test commit:** `264b0b6f test(v2): update prompt contract assertions for W6-C high-jump recalibration`
**W4A/W4C dedup commit:** `ed639a1a fix(v2): deduplicate source material text hashes instead of blocking at W4A`
**W4G/shell dedup commit:** `fc5e7f8e fix(v2): deduplicate text hashes in W4G and corpus shell gates`

## Summary

Phase 1 prompt recalibration **validated**. Canary slot 19 confirmed the LLM
now routes to `caveat_report` (was `refine_retrieval`) with 6 EvidenceItems.
The pipeline progressed past W6-C sufficiency to W7 boundary verdict candidate
formation — the first time the V2 evidence lifecycle has reached this stage.

## Validated Canary: Slot 19

**Job ID:** `099eb05cbbca408a87f7168327926762`
**Claim:** "Using hydrogen for cars is more efficient than using electricity"
**Pipeline:** `claimboundary-v2`

### Success Criteria

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| `assessmentStatus` | `sufficiency_assessment_completed` | `sufficiency_assessment_completed` | PASS |
| `sufficiencyResultStatus` | — | `accepted` | PASS |
| `reportStopRecommendation` | `caveat_report` or `continue_to_boundary_formation` | `caveat_report` | PASS |
| `boundaryVerdictCandidateStatus` | past `blocked` | `boundary_verdict_candidate_ready` | PASS |
| `admittedEvidenceItemCount` | >0 | 6 | PASS |

### Upstream Stop Attribution (full chain)

| Stage | Status |
|-------|--------|
| W5 Bounded Evidence Extraction | `hidden_evidence_item_extraction_completed` / `accepted` / `evidence_extracted` (6 items) |
| W5H Evidence Item Handoff | `evidence_items_ready_for_downstream_internal_handoff` (6 items) |
| W6A Sufficiency Intake | `sufficiency_intake_ready_for_contract_only_assessment` |
| W6-C Sufficiency Assessment | `sufficiency_assessment_completed` / `accepted` / **`caveat_report`** |
| W7A Boundary Verdict Candidate | `boundary_verdict_candidate_ready` (`closed_until_llm_task_approved`) |
| W8A Internal Alpha Report Stop | `alpha_report_stop_created_not_report_ready` |
| W7B2 Boundary Verdict Execution | `boundary_verdict_execution_damaged` (expected: W7 LLM task not approved) |

### Telemetry

- Provider: `anthropic / claude-haiku-4-5-20251001`
- Tokens: 12,644 input / 3,545 output / 16,189 total
- Duration: 32,323ms
- Schema retries: 2
- Evidence items: 6 (all statement byte lengths: 268, 239, 256, 230, 190, 229)

### Warning Materiality

- `upstreamSufficiencyStatus: "accepted"`
- `upstreamRecommendedNextAction: "caveat_report"`
- `boundaryVerdictIntegrityEventCount: 1`
- `candidateMaterialUncertaintySignalCount: 0`

## Second Canary: Slot 20 (Incomplete)

**Job ID:** `68a4fa4fa99f48c18679e9b68e3ff344`

Job SUCCEEDED (precutover envelope OK). W4 and W5 artifacts exist. Report-result
artifact not recorded — runtime error swallowed by catch block at
`orchestrator.ts:411` somewhere in sufficiency/boundary-verdict path. Intermittent.

## Prior Canaries (Before Dedup Fix)

| Slot | Job ID | Status | W4A Result | W6-C Reached |
|------|--------|--------|------------|--------------|
| 16 | `1702d507be6e4aa393a2ff95fb1eded5` | SUCCEEDED | blocked: `source_material_record_count_unsupported` | No |
| 17 | `64a360acf7454fecb8e6253a2e2d73fd` | SUCCEEDED | blocked: `source_material_record_count_unsupported` | No |

Both blocked at W4A due to duplicate `sourceMaterialTextHash` values. Fixed by
commits `ed639a1a` and `fc5e7f8e`.

## What Was Validated

- **Prompt edit:** Applied and committed (`0c44d391`). LLM behavior confirmed
  changed from `refine_retrieval` to `caveat_report`.
- **W4A/W4C/W4G/shell dedup:** All four gates successfully deduplicate instead
  of blocking. 6 source materials → some duplicates skipped → extraction
  proceeds.
- **Test suite:** 493 passed across 67 files. No regressions.
- **Steer-Co consent:** Full 3-model-family panel returned SUPPORT.
- **Lead Developer debate:** APPROVED WITH NOTES.
- **Pass-through path:** Confirmed — `sufficiencyStopReason()` returns `null`
  for `caveat_report`, allowing W7+ progression.
- **End-to-end to W7:** Pipeline reached `boundary_verdict_candidate_ready` for
  the first time.

## What Was NOT Validated

- **W7 LLM boundary/verdict formation:** W7 LLM task is
  `closed_until_llm_task_approved`. The pipeline reaches W7 but cannot execute
  the LLM call — this is by design (separate approval gate).
- **Stability:** Second canary failed to record artifacts (intermittent runtime
  error). One validated run, not two.
- **Report quality:** No report prose generated (W7 blocked). Quality review
  deferred to when W7 is approved.

## Budget Status

- **Slots used:** 20 of 20
- **Validated canaries:** 1 of 2 target

## Next Steps

1. **Accept Phase 1 as validated** with 1 canary (prompt change demonstrably
   works), OR request Captain approval for additional budget slots.
2. **Update WIP doc** — this document is the record.
3. **Phase 2 "Raise the Bar"** — per-dimension floor clauses, Captain-gated.
4. **W7 LLM task approval** — separate workstream needed to unlock boundary
   verdict execution.
