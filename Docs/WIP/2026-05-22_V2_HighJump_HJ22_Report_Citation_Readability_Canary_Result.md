# V2 HighJump HJ22 Report Citation Readability Canary Result

**Date:** 2026-05-22
**Classification:** `PASS_X7_HJ22_REPORT_CITATION_READABILITY_CANARY`
**Job:** `4e81f840f6e04e2793e9ec162ee7bef2`
**Runtime:** `2e12b25493cd8a6002ce93b2f597d217491d95ed`
**Implementation commit:** `2e12b25493cd8a6002ce93b2f597d217491d95ed`

## Purpose

HJ22 verified the next HighJump quality bar after HJ21: admin-visible V2 report markdown should be easier to read and inspect, with visible evidence citations in the report text, while the manual/default V2 path and public precutover containment remain unchanged.

## Change Under Test

Commit `2e12b254` made two narrow changes:

- `V2_AGGREGATION_NARRATIVE` now requires exact supplied EvidenceItem IDs in square brackets next to material evidence-backed report prose and a compact `Evidence References` subsection.
- The claim-selection preparation page now shows the draft `pipelineVariant` as `Pipeline V2` / `Pipeline V1` / default, so the manual preparation page no longer leaves the active pipeline ambiguous before a final job exists.

No public V2 result exposure, schema relaxation, source/provider widening, parser/cache/SR/storage behavior, or V1 work was added.

## Submission

Input:

`Using hydrogen for cars is more efficient than using electricity`

Submission path:

- `POST /api/fh/analyze`
- no explicit `pipelineVariant`
- invite code supplied by the local test environment

This is the normal manual web path. The job stored `pipelineVariant = claimboundary-v2`.

## Result Evidence

- Job status: `SUCCEEDED`
- API/Web runtime hash: `2e12b25493cd8a6002ce93b2f597d217491d95ed`
- Admin report markdown length: `8190`
- Public/default report markdown length: `null`
- Public result schema: `4.0.0-cb-precutover`
- Public cutover status: `blocked_precutover`
- Public warning posture: `report_damaged`

Primary report verdict:

- Label: `FALSE`
- Truth percentage: `25`
- Confidence: `72`

The hydrogen-family expected band remains satisfied: `FALSE` / `MOSTLY-FALSE`, truth `5..25`, confidence `65..85`.

Citation/readability evidence:

- `## Evidence References` is present.
- Inline report citations are present using exact supplied EvidenceItem IDs:
  - `[EVI_001_BEV_HYDROGEN_EFFICIENCY_COMPARISON]`
  - `[EVI_002_HYDROGEN_PRODUCTION_EMISSIONS]`
  - `[EVI_003_ELECTRIC_VEHICLE_EFFICIENCY_ADVANTAGE]`

## Information Yield

`report_produced`

HJ22 proves that the default/manual V2 path can produce an authenticated-admin report with readable evidence references after the prompt repair. It does not prove broader report-quality robustness across topics.

## Remaining Risks

- This is still one Captain-defined input. It is no longer enough to continue judging V2 report readiness through single canaries.
- The next step should be a compact report-quality gauntlet over multiple Captain-defined inputs, using expectation/comparator checks where available.
- Public V2 remains intentionally blocked/precutover; this canary is not public cutover evidence.

## Budget

The active HighJump continuation tranche moves from `3` remaining to `2` remaining after this job.
