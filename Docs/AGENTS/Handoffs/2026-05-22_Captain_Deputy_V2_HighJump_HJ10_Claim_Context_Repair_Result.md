# Captain Deputy Handoff: V2 HighJump HJ10 Claim-Context Repair Result

**Date:** 2026-05-22
**Role:** Captain Deputy / Lead Developer
**Agent:** Codex (GPT-5.5) + Claude Opus 4.6 review
**Tier:** Significant
**Status:** HJ10 result documented; next step is Steer-Co on source-material/evidence coverage

## Summary

HJ10 ran exactly one HighJump canary after commit
`b9fe317485fbd155abcdde9247b6ea6a247ca4a9`, which passed focused/expanded
W7-B verifiers, boundary guard, V2 gate validation, gate-register self-test,
`npm run debt:sensors` (`advisory_warn`), build, and `git diff --check`.

Job `c255f82d7f994dc1a0a4ce195b9d1cbf` completed on runtime
`b9fe317485fbd155abcdde9247b6ea6a247ca4a9`. Public V2 remained
`4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`.

Classification:

`PASS_X7_HJ10_CLAIM_CONTEXT_REPAIR_NO_OFF_COMPARATOR_TRUE_VERDICT_INTERNAL_ALPHA_UNVERIFIED`

## What Changed Before HJ10

W7-B boundary/verdict execution now receives a bounded selected AtomicClaim
projection from the Claim Understanding `ClaimContract`:

- selected claim id;
- selected claim statement;
- statement hash;
- statement byte length.

The owner includes that projection in the rendered `V2_BOUNDARY_VERDICT_EXECUTION`
packet. W7-B fails closed when selected-claim context is absent, invalid, or
drifts. No deterministic comparator heuristic was added.

## Canary Result

HJ10 created one internal Alpha verdict candidate:

- `VC_INSUFFICIENT_DIRECT_COMPARISON`
- Verdict label: `UNVERIFIED`
- Internal truth candidate: `0`
- Internal confidence candidate: `15`
- W8-G draft: `5150` bytes
- W8-G draft hash:
  `a6f9414e2cb09958b872ebc0ad69d1b6092ef74b91b2035ef4cd5012d12fcada`

The internal draft now correctly refuses to turn off-comparator
fuel-cell-versus-gasoline/hybrid evidence into a positive answer for the
selected hydrogen-versus-electricity claim.

## Containment

- W8-G default route: authenticated `200`, `no-store`,
  `draftMarkdownReturned = false`.
- W8-G inspection route: authenticated `200`, `no-store`,
  `draftMarkdownReturned = true`.
- W8-G unauthenticated route: `401`, `no-store`.
- Public output exposed no internal draft, verdict, truth, confidence, source
  text, EvidenceItem text, prompt text, provider payload, or hidden ledger id.

## Remaining Gap

HJ10 is not yet a full report-quality pass for the Captain expectation on this
claim family. The result is now correctly cautious, but the target report should
be false-side when direct comparison evidence is available.

The next gap is upstream evidence coverage:

- W2/W3-A preview had electric-side candidates including `Electric car`,
  `Battery electric vehicle`, and `Electric vehicle conversion`.
- W3-B Source Material fetched six records but did not carry those electric-side
  vehicle records into W5.
- W7-B can only judge the EvidenceItems it receives.

Likely next repair target: a bounded W3-B Source Material/evidence-coverage
repair that carries a broader still-capped set of materialized W3-A records into
W5, instead of another W7-B prompt patch.

## Live-Job Budget

HighJump tranche after HJ10: `2` remaining.

## Warnings

- Do not record HJ10 as public report readiness.
- Do not run another canary before a committed repair and runtime refresh.
- Do not add deterministic semantic comparator code.
- Do not publicize V2, expose compatibility projections, or touch V1 cleanup.
- The next source-material repair may be simple cap/budget work, but it is still
  debt-sensitive and should use `/debt-guard` plus Steer-Co consent before code.

## Learnings

- Prompt-only comparator guidance was insufficient while W7-B lacked selected
  AtomicClaim context.
- The cleanest fix was to amend the existing W7-B input packet rather than add
  a separate comparator checker or loosen verdict bars.
- The next report-quality bottleneck is evidence portfolio composition, not W7-B
  schema or W8-G draft projection.
