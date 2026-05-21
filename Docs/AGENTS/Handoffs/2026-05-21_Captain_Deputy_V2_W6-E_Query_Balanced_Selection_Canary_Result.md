# Captain Deputy Handoff - V2 W6-E Query-Balanced Selection Canary Result

**Date:** 2026-05-21
**Role:** Captain Deputy
**Slice:** W6-E Query-Balanced Source Material Selection
**Result:** `PASS_X7_W6_E_QUERY_BALANCED_SELECTION_VERIFIED_PROVIDER_DIVERSITY_REQUIRED`

## Summary

W6-E ran exactly one authorized canary. Job
`6a09d149d5d046cb95d0cdd67e02c095` executed on runtime
`f1a45285f2d2b22fceb03d91007f9d24c47fdce8` and stayed public
`4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`.

The new W6-E selector was exercised: W3-B selected Source Material records from
three provider-attempt groups: `1`, `2`, and `3`. Containment held across the
captured default-admin routes. W5 accepted three EvidenceItems. W6-C still
recommended `refine_retrieval`.

## Live Job

- Job: `6a09d149d5d046cb95d0cdd67e02c095`
- Classification: `PASS_X7_W6_E_QUERY_BALANCED_SELECTION_VERIFIED_PROVIDER_DIVERSITY_REQUIRED`
- Runtime commit: `f1a45285f2d2b22fceb03d91007f9d24c47fdce8`
- Ledger id: `6a09d149d5d046cb95d0cdd67e02c095:precutover-observability`
- Remaining live-job budget after this job: `1`

## Evidence

- W3-B Source Material: `source_material_page_summary_completed`, `3` records.
- W3-B selected ids: `SOURCE_CANDIDATE_PREVIEW_1_1`,
  `SOURCE_CANDIDATE_PREVIEW_2_1`, `SOURCE_CANDIDATE_PREVIEW_3_1`.
- W3-B distinct provider-attempt groups: `3`.
- W4-G bounded text: singular and plural sidecar projections redacted by
  default.
- W5 bounded extraction: `hidden_evidence_item_extraction_completed`,
  `accepted`, `3` EvidenceItems, `schemaDiagnostics = null`.
- W6-C sufficiency: `sufficiency_assessment_completed`, `accepted`,
  `schemaDiagnostics = null`, `reportStopRecommendation = refine_retrieval`.
- W8-B: `internal_alpha_report_result_blocked`, first incomplete stage
  `boundary_verdict_candidate`.

Captured artifacts are under:

- `test-output/live/w6e-canary-6a09d149d5d046cb95d0cdd67e02c095/`

## Warnings

- Do not spend another live job on same-provider page-summary selection variants.
- Do not weaken W6 prompts or relax W7 gates as a workaround.
- The remaining live-job budget is `1`; provider/source diversity should be
  designed before spending that final slot.

## Learnings

- Query-balanced selection worked mechanically and improved structural breadth
  across the existing W2/W3 same-provider path.
- W6-C still requests retrieval refinement, so the missing signal is likely
  broader source/provider coverage rather than more candidate shuffling within
  the current Wikimedia-only path.

## Next Agent Context

Prepare a provider/source diversity review package before W6-C. Keep public V2
blocked, preserve W6 quality, preserve W7 fail-closed gates, and do not start
parser/cache/SR/storage/ACS/direct URL/V1 work without explicit package scope.
