# V2 HighJump HJ7 Internal Alpha Report Result

**Date:** 2026-05-22
**Status:** Completed live-result record
**Owner:** Captain Deputy / Lead Developer
**Input:** `Using hydrogen for cars is more efficient than using electricity`

## Decision Record

HJ7 is classified as:

`PASS_X7_HJ7_INTERNAL_ALPHA_REPORT_CANDIDATE_CREATED`

This is the first HighJump canary in the current tranche where the hidden V2
product route reached an internal Alpha report-result candidate without a
blocked or damaged upstream stage. It is not public report readiness and it is
not a public cutover signal.

## Runtime And Job

- Job id: `3716afb37a504dd880cbf313f0fd7c5c`
- Runtime commit: `ea8ac958dfaab4436f73c58343b62d46a47a3d21`
- Expected runtime commit: `ea8ac958dfaab4436f73c58343b62d46a47a3d21`
- Job status: `SUCCEEDED`
- Captured output directory:
  `test-output/v2-highjump-w7bseed-3716afb37a504dd880cbf313f0fd7c5c`

Public V2 stayed `4.0.0-cb-precutover` / `claimboundary-v2` /
`report_damaged`.

## Repair Chain Since HJ3

- `0dc68a1eac7a6d75df2600095ff8902e0d89604e`:
  canonicalized server-owned W7-B warning-materiality lineage fields before
  schema validation.
- `62c92186d04133e0a4c5511c487a420ddbdac1f9`:
  deduplicated exact duplicate Source Material records by text hash before
  W4-A duplicate-id validation.
- `ea8ac958dfaab4436f73c58343b62d46a47a3d21`:
  carried deduplicated W4-C admission fan-in into the W4-D corpus shell.

These were amendments to existing mechanisms. No new hidden route, public
projection, provider, parser, cache/SR/storage path, or V1 path was added.

## Hidden Chain Evidence

The authenticated no-store artifact routes were reachable for Claim
Understanding, Query Planning, Source Acquisition, Source Material, Evidence
Corpus readiness, bounded evidence extraction, bounded corpus text, extraction
input, and internal Alpha report result. W8 unauthenticated access returned
`401` with `no-store`; authenticated W8 returned `200` with `no-store`.

Key stage results:

| Stage | Status |
|---|---|
| W4-A | `source_material_structurally_admissible_evidence_corpus_gate_closed` |
| W4-A count | `6` Source Material records, `5` admitted, `1` rejected |
| W4-G | `bounded_corpus_text_sidecar_created_extraction_gate_closed` |
| W4-H | `bounded_extraction_input_packet_created_extraction_execution_closed` |
| W5 | `hidden_evidence_item_extraction_completed` |
| W5 count | `5` EvidenceItems |
| W6-C | `sufficiency_assessment_completed` |
| W6-C result | `accepted`; `reportStopRecommendation = caveat_report`; `5` admitted EvidenceItems |
| W7-B | `boundary_verdict_candidates_created_internal`; runtime-owned |
| W7-B count | `5` boundary candidates, `5` verdict candidates, `5` cited EvidenceItem refs |
| W8-B | `internal_alpha_report_result_candidate_created` |
| W8-B stop | `firstIncompleteStage = none`; no blocked/damaged reason |

W7-B provider/cost telemetry:

- Provider: `anthropic`
- Model: `claude-haiku-4-5-20251001`
- Input tokens: `6253`
- Output tokens: `2883`
- Total tokens: `9136`
- Duration: `21103ms`
- Attempt count: `1`
- Schema retry count: `0`
- Cache decision: `no_store_no_read`

Warning materiality inputs:

- `warningPublication = closed`
- `userVisibleWarningCount = 0`
- `upstreamSufficiencyStatus = caveated`
- `upstreamRecommendedNextAction = caveat_report`
- `boundaryVerdictIntegrityEventCount = 0`
- `candidateMaterialUncertaintySignalCount = 10`

## Containment

Public result remains damaged/precutover. The W8 default artifact projection is
internal/admin-only and returns structured candidate metadata, hashes, lengths,
provenance, and telemetry only. It does not return source text, EvidenceItem
text, prompt text, provider payload, internal ledger ids, report prose, public
verdict, public truth percentage, public confidence, or public warnings.

Leak scan note: the HJ7 captured output directory was checked for raw source,
EvidenceItem, prompt, provider-payload, and canary-domain text markers. No hits
were found in hidden artifacts. The public job/result may contain the original
user input by design.

## Live-Job Budget

The HighJump tranche started with `12` jobs. HJ2 through HJ7 consumed `6` jobs.

Current remaining HighJump live-job budget: `6`.

The machine-readable ledger is
`Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`.

## Interpretation

HJ7 proves that the V2 direct-text internal route can now create a hidden Alpha
report-result candidate over actual hidden EvidenceItems and runtime-owned
boundary/verdict candidates. It does not yet prove:

- public report readiness;
- report prose quality;
- comparator alignment against Captain expectations;
- final warning/truth/confidence publication behavior;
- cutover readiness;
- V1 cleanup readiness.

The next work should continue report creation rather than return to broad
readiness scaffolding. The recommended next package is a narrow internal report
prose/review path over the existing W8-B candidate, keeping public V2 blocked
until report quality is inspected and improved.

## Stop / Escalation Signals

Stop and use Steer-Co or Captain approval if the next step would:

- expose V2 results publicly;
- publish verdict/truth/confidence/warnings outside internal Alpha surfaces;
- leak source text, EvidenceItem text, prompt text, provider payloads, or hidden
  ledger ids in public/default-admin/log/error surfaces;
- add another hidden observability layer without producing report value or
  retiring/merging older machinery;
- require model/config/schema/UCM/gateway approval changes beyond already
  authorized prompt edits;
- propose V1 cleanup or V1 removal.
