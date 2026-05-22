# V2 HighJump HJ10 Claim Context Repair Result

**Date:** 2026-05-22
**Status:** Completed live-result record
**Owner:** Captain Deputy / Lead Developer
**Input:** `Using hydrogen for cars is more efficient than using electricity`

## Decision Record

HJ10 is classified as:

`PASS_X7_HJ10_CLAIM_CONTEXT_REPAIR_NO_OFF_COMPARATOR_TRUE_VERDICT_INTERNAL_ALPHA_UNVERIFIED`

This is a pass for the W7-B claim-context repair. It is not yet a full report
quality pass.

## Canary Evidence

- Job id: `c255f82d7f994dc1a0a4ce195b9d1cbf`
- Runtime commit: `b9fe317485fbd155abcdde9247b6ea6a247ca4a9`
- Job status: `SUCCEEDED`
- Public status: `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged`
- W8-B status: `internal_alpha_report_result_candidate_created`
- W8-G status: `internal_alpha_report_draft_created`
- W8-G draft: `5150` bytes, hash
  `a6f9414e2cb09958b872ebc0ad69d1b6092ef74b91b2035ef4cd5012d12fcada`
- W7-B provider/model: `anthropic` / `claude-haiku-4-5-20251001`
- W7-B token usage: `8661` total tokens
- W7-B duration: `14180ms`
- Captured artifacts:
  `test-output/v2-highjump-hj10-c255f82d7f994dc1a0a4ce195b9d1cbf`

## Hidden Chain Result

HJ10 created one internal Alpha verdict candidate:

- `VC_INSUFFICIENT_DIRECT_COMPARISON`
- Verdict label: `UNVERIFIED`
- Internal truth candidate: `0`
- Internal confidence candidate: `15`
- EvidenceItem refs: `6`

The draft states that the available evidence gives definitional/contextual
information and some hydrogen-efficiency challenge material, but lacks a direct
empirical comparison between hydrogen and electric vehicle efficiency. This is
the correct containment behavior for the W7-B repair: the pipeline no longer
turns off-comparator fuel-cell versus gasoline/hybrid evidence into a positive
answer for the selected claim.

## Route And Leak Checks

- W8-G default route: `200`, `Cache-Control: no-store`,
  `draftMarkdownReturned = false`
- W8-G inspection route: `200`, `Cache-Control: no-store`,
  `draftMarkdownReturned = true`
- W8-G unauthenticated route: `401`, `Cache-Control: no-store`
- Public leak markers found: none
- Public V2 remained pre-cutover/damaged with no public verdict, truth,
  confidence, report, or draft output.

## Remaining Report-Quality Gap

HJ10 is still not the target report outcome for this benchmark family. The
Captain expectation for this claim family remains false-side report behavior,
not merely `UNVERIFIED`.

The actionable upstream gap is evidence coverage. W2/W3-A preview contained
relevant electric-side candidates such as `Electric car`, `Battery electric
vehicle`, and `Electric vehicle conversion`. W3-B Source Material fetched six
records, but the selected material did not carry the electric-side vehicle
records into W5. W7-B can only judge the EvidenceItems it receives.

## Live-Job Budget

HJ10 consumed one HighJump live job. Remaining budget after HJ10: `2`.

## Next Action

Convene Steer-Co for the next bounded repair. The likely repair target is
Source Material / evidence coverage, not another W7-B verdict prompt patch:
carry a broader but still bounded set of W3-A materialized records into W3-B so
the evidence portfolio includes both sides of a comparison when W2 already
found those candidates.
