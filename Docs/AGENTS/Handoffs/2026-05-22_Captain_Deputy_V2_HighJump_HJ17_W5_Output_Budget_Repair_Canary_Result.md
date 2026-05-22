# Captain Deputy Handoff - V2 HighJump HJ17 W5 Output Budget Repair Canary Result

## Summary

HJ17 passed its canary. The W5 parse/truncation stop from HJ16 is closed: W5
accepted strict JSON below the new `8000` output-token ceiling, extracted hidden
EvidenceItems, and downstream W8-B/W8-G created an internal Alpha report result
candidate and draft.

Current HEAD during result capture:
`c63f8a90ce38f419c458c5f4e6cc1d05ec150edc`.

## Canary

- Job: `ec943a2eeedf41a5890c7a0222286f50`
- Runtime: API/Web `c63f8a90ce38f419c458c5f4e6cc1d05ec150edc`
- Input: `Using hydrogen for cars is more efficient than using electricity`
- Variant: `claimboundary-v2`
- Classification:
  `PASS_X7_HJ17_W5_OUTPUT_BUDGET_REPAIR_INTERNAL_ALPHA_DRAFT_CREATED`

## Hidden Chain Evidence

- Claim Understanding: `completed`, schema `accepted`.
- Query Planning: `completed`, result `accepted`, `4` query entries.
- W2: provider network ran; hidden candidate telemetry present.
- W4-A: `9` Source Material records admitted.
- W5: `hidden_evidence_item_extraction_completed`,
  `extractionResultStatus = accepted`, `extractionStatus = evidence_extracted`,
  `evidenceItemCount = 3`.
- W5 telemetry: `8313` input tokens, `1588` output tokens, `9901` total tokens,
  `14337ms`; the `8000` output-token ceiling was not approached.
- W8-B: `internal_alpha_report_result_candidate_created`,
  `firstIncompleteStage = none`, `3` boundary candidates, `2` verdict
  candidates, `3` cited EvidenceItem refs.
- W8-G: `internal_alpha_report_draft_created`, `5413` byte draft, `3` boundary
  drafts, `2` verdict drafts, `3` cited EvidenceItem refs.

## Containment

Public V2 stayed `4.0.0-cb-precutover` / `blocked_precutover` /
`report_damaged`. Default W8-G admin projection returned only
hash/length/provenance metadata with `draftMarkdownReturned = false`; explicit
authenticated inspection returned draft Markdown for review. No public or
default-admin draft/source/evidence/prompt/ledger leak was observed in captured
artifacts.

## Interpretation

HJ17 is a successful W5 output-budget repair and should not be rerun. The next
workstream should inspect and improve internal report quality. Initial admin
inspection shows the draft is now present, so the remaining issue is report
content and presentation quality rather than pipeline reachability.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism`.

Chosen option: amend existing W5 output budget and prompt compactness
instruction.

Rejected path: chunking, retries, schema relaxation, source dropping, provider
changes, and further aggregate-cap changes because the HJ17 canary proved the
existing W5 path can complete with the bounded output-budget repair.

What was removed/simplified: none.

What was added: no new runtime mechanism; one existing model-policy budget and
one existing prompt section were amended.

Net mechanism count: unchanged.

Verification: HJ17 local verifier set passed before commit; canary job
`ec943a2eeedf41a5890c7a0222286f50` passed the W5 output-budget criteria.

Debt accepted and removal trigger: the internal Alpha draft remains hidden-only
until report-quality review and public cutover readiness are separately
accepted.

Residual debt: HighJump exception live-job overrun is recorded in
`Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`; next live job requires fresh
Steer-Co/Captain budget reconciliation.

## Next Agent Context

Do not run a second HJ17 canary. Convene Steer-Co for the next balanced
report-quality package. The likely next question is how to turn the internal
Alpha draft into a more useful full report without weakening public containment
or adding another hidden readiness layer.
