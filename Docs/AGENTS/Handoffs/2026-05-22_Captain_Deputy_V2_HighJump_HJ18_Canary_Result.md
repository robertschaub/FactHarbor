# Captain Deputy V2 HighJump HJ18 Canary Result

## Summary

HJ18 canary job `c75322fad1e74218b8ee51a54f2307cd` ran once on the
`claimboundary-v2` product route. The run proved that the hidden/internal
`aggregation_narrative` report-writer owner is reachable and contained, but it
did not produce a usable internal report. The report-writer artifact failed
closed as `internal_report_writer_damaged` / `parse_failure` after the provider
output reached the `4000` output-token ceiling and could not be parsed as JSON.

Classification:
`STOP_X7_HJ18_INTERNAL_REPORT_WRITER_PARSE_FAILURE_CONTAINED`

## Current Head And Runtime

- Current HEAD while recording this result: `a6b4159d`
- HJ18 implementation commit: `ceb6a38395f2a36bc3eeeeba8ab2818524222013`
- Canary runtime commit reported by the job:
  `44395adc13a9b28faa7bec862dafda52682805ed`
- Job id: `c75322fad1e74218b8ee51a54f2307cd`
- Captain-defined input:
  `Using hydrogen for cars is more efficient than using electricity`

## Public Result

- API job status: `SUCCEEDED`
- Pipeline variant: `claimboundary-v2`
- Public schema: `4.0.0-cb-precutover`
- Public cutover status: `blocked_precutover`
- Public analysis issue: `report_damaged`
- Public verdict/truth/confidence: unavailable
- Public result remained the intentionally damaged V2 pre-cutover envelope.
- No HJ18 report markdown, hidden report-writer data, source text, EvidenceItem
  text, prompt text, provider payload, internal ids, or hidden ledger reference
  was exposed publicly.

## Hidden Artifact Evidence

Ledger:
`c75322fad1e74218b8ee51a54f2307cd:precutover-observability`

Route:
`/api/internal/analyzer-v2/evidence-lifecycle-internal-report-writer-artifacts`

- Route returned `ok = true` with `artifactCount = 1`.
- Default projection was `hash_length_provenance_only`.
- `reportMarkdownReturned = false`.
- HJ18 status: `internal_report_writer_damaged`.
- `damagedReason = parse_failure`.
- `aggregationNarrativeResultStatus = damaged`.
- `reportReviewReadiness = damaged_before_internal_report_review`.
- `reportMarkdownByteLength = 0`.
- `reportMarkdownHash = null`.
- Parent hidden state was present:
  - W8-B: `internal_alpha_report_result_candidate_created`
  - W7-B: `boundary_verdict_candidates_created_internal`

## Runtime Telemetry

- Gateway task: `aggregation_narrative`
- Prompt section: `V2_AGGREGATION_NARRATIVE`
- Prompt content hash:
  `6a05399dbe42cdb60e3f79183e29996686c260bb457332c5760ab4bf323a8a10`
- Rendered prompt hash:
  `718e632b0dc45cdcc30245af838863b9dc2c3e0a5a68b7b819b66049c56db48c`
- Output schema: `v2.aggregation_narrative.0`
- Model policy: `v2.model.aggregation_narrative.hj18`
- Provider/model: `anthropic` / `claude-haiku-4-5-20251001`
- Token usage: `5179` input / `4000` output / `9179` total
- Duration: `27649` ms
- Cache decision: `no_store_no_read`
- Schema diagnostics:
  - `outputParseStatus = parse_failure`
  - `failureCategory = parse_failure`
  - issue code `json_parse_error`
  - raw provider output not returned

Side effects remained contained:

- LLM report prose call, prompt load/render, adapter call, model call, provider
  callback creation, provider SDK load, and no-store cache decision construction
  occurred.
- Cache read/write, parser execution, Source Reliability read/write, storage
  write, public report generation, public surface write, compatibility
  projection, verdict publication, warning publication, confidence publication,
  and truth-percentage publication did not occur.

## Budget

The current HighJump continuation tranche was reset to `8` jobs before HJ18.
HJ18 consumed `1`; remaining budget is `7`.

## Interpretation

HJ18 is not a report-quality pass. It is a contained product-route reachability
observation for the internal report writer.

The observed blocker is narrow and concrete: `aggregation_narrative` output
budget/compactness. This is analogous to the earlier HJ17 W5 output-budget
repair, but must stay scoped to the report writer.

## Next Concrete Action

Prepare HJ19 as a narrow report-writer output-budget/compactness repair:

- amend only the existing HJ18 report-writer path, prompt contract, model output
  budget, and focused tests as needed;
- preserve verdict-value and citation-id preservation checks;
- preserve hash/length/provenance-only default admin projection;
- run verifiers, commit, refresh runtime, and then run at most one canary if the
  package and budget accounting allow it.

Do not change source acquisition, W4/W5/W6/W7 behavior, provider selection,
parser/cache/SR/storage, public behavior, ACS/direct URL, V1 work, or V1
cleanup for this stop.

## Warnings

- No second HJ18 canary is authorized.
- Do not classify HJ18 as `PASS`.
- The next repair must not add a new readiness/proof layer; it should repair the
  observed report-writer parse/truncation stop directly.
