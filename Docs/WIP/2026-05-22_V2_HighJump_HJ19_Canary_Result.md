# V2 HighJump HJ19 Canary Result

**Date:** 2026-05-22
**Classification:** `STOP_X7_HJ19_PRE_REPORT_WRITER_W5_EVIDENCE_ITEMS_TOO_BIG`

## Summary

HJ19 implementation commit `2cdc9ce5` repaired the existing hidden/internal
`aggregation_narrative` report-writer output budget and compactness guidance.
After the separate current-lane projection commit, runtime was refreshed to
`4e2ed0982d0eecfb8cd5e0098bca0c8342611e77`.

Exactly one HJ19 canary was submitted with explicit `claimboundary-v2`:

`Using hydrogen for cars is more efficient than using electricity`

Job id:

`7522df8a2f1647adb80d230efcfafe40`

The job reached hidden CU, Query Planning, W2, and W5. It did not reach W8-B,
W8-G, or HJ19 report-writer execution because W5 failed closed first with
`schema_validation_failed`. The relevant schema diagnostic includes
`evidenceItems` / `too_big`.

## Runtime And Public Result

- Runtime commit reported by Web/API/job:
  `4e2ed0982d0eecfb8cd5e0098bca0c8342611e77`
- Job status: `SUCCEEDED`
- Submitted pipeline variant: `claimboundary-v2`
- Public schema: `4.0.0-cb-precutover`
- Public cutover status: `blocked_precutover`
- Public analysis issue: `report_damaged`
- Public verdict/truth/confidence: unavailable
- Public result remained the intentionally damaged V2 pre-cutover envelope.
- Public `reportMarkdown` contained only the standard pre-cutover damaged shell
  text, not hidden report-writer output.

## Hidden Chain Evidence

Ledger:

`7522df8a2f1647adb80d230efcfafe40:precutover-observability`

Reachability:

- Claim Understanding route: `200`, `artifactCount = 1`
- Query Planning route: `200`, `artifactCount = 1`
- W2 candidate-provider network route: `200`, `artifactCount = 1`
- W5 bounded evidence extraction route: `200`, `artifactCount = 1`
- W8-B internal Alpha result route: `404`
- W8-G internal Alpha draft route: `404`
- HJ19 internal report-writer route: `404`

Key statuses:

- CU: `completed`, schema `accepted`
- Query Planning: `completed`, schema `accepted`, `queryEntryCount = 4`
- W2: `candidate_provider_network_completed`
  - `queryEntryCount = 4`
  - each query observed a provider attempt with `candidateCount = 3`
- W5:
  - `status = damaged_execution`
  - `damagedReason = schema_validation_failed`
  - `extractionResultStatus = damaged`
  - `evidenceItemCount = 0`
  - schema diagnostics:
    - `outputParseStatus = parsed`
    - `failureCategory = schema_validation`
    - `issueCount = 8`
    - issue includes path `evidenceItems`, code `too_big`
  - token usage: `8673` input / `1497` output / `10170` total

Containment:

- Default HJ19 route returned authenticated bounded `404` with `no-store`.
- Unauthenticated HJ19 route returned `401` with `no-store`.
- W5 default route remained hash/length/provenance-only.
- Public/default-admin surfaces did not expose source text, evidence item text,
  prompt text, provider payload, hidden ledger ids, or report-writer markdown.
- Parser, cache read/write, Source Reliability read/write, storage write,
  public report generation, verdict generation/publication, warning generation,
  confidence generation, and public projection remained closed.

## Interpretation

HJ19 is implementation-clean but not canary-validated. The canary did not test
the HJ19 repair because the run stopped earlier at W5.

The new active stop is not report-writer output budget. It is W5 evidence-item
contract/output alignment under the richer nine-record mixed OpenAlex/Wikimedia
source packet. The output was parseable JSON but failed strict schema validation
because the evidence item array exceeded the current accepted shape.

## Budget

The active HighJump continuation tranche had `7` remaining before HJ19.
This canary consumed `1`; remaining budget is now `6`.

No second HJ19 canary is authorized from this result.

## Next Concrete Action

Steer the smallest HJ20 repair for the W5 `evidenceItems too_big` stop.

Default direction:

- Treat the root cause as incomplete existing W5 output-shaping under richer
  source packets.
- Prefer a topic-neutral W5 prompt/contract alignment that tells the model to
  produce a bounded, consolidated set of the strongest distinct EvidenceItems
  rather than one item per source or per minor detail.
- Do not add retries, schema relaxation, a new source/provider path, another
  report layer, public projection, parser/cache/SR/storage behavior, ACS/direct
  URL, V1 work, or V1 cleanup.

Before any next canary:

- implement and commit the HJ20 repair;
- refresh runtime;
- verify API/Web runtime commit match;
- preflight hidden/default route redaction and public leak posture.
