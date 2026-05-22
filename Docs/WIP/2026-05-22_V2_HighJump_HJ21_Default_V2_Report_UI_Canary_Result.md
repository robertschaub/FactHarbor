# V2 HighJump HJ21 - Default V2 Manual UI Report Canary Result

## Result

Classification:

`PASS_X7_HJ21_DEFAULT_V2_MANUAL_UI_REPORT_CANARY`

Job:

`15d19b57f0fb488ea820bac0e2fb6dac`

Runtime:

`7b900247c8bf5a488923c23516f160cd51753396`

Implementation anchors:

- `298ad76f fix(v2): align highjump boundary verdict comparisons`
- `79a5c31f feat(v2): default manual jobs to pipeline v2`
- `7b900247 docs(v2): sync highjump lane to default v2 path`

Input:

`Using hydrogen for cars is more efficient than using electricity`

Submission:

- route: `http://localhost:3000/api/fh/analyze`
- body intentionally omitted `pipelineVariant`;
- invite code was required by the API and supplied after an initial rejected
  no-job attempt;
- stored job `pipelineVariant`: `claimboundary-v2`.

## Pass Evidence

- Job status: `SUCCEEDED`.
- Created and executed commit hashes both match runtime `7b900247`.
- Result schema: `4.0.0-cb-precutover`.
- Result pipeline: `claimboundary-v2`.
- Public cutover status: `blocked_precutover`.
- Authenticated admin job API returned `reportMarkdown` length `7605`.
- Public/default job API returned `reportMarkdown = null`.
- The job page has the committed `V2 Report` rendering path from `79a5c31f`;
  browser automation was not available in this Codex session, so the verified
  signal is the admin job API payload consumed by that page.

## Report Quality Snapshot

The internal V2 report is now complete enough for review and visible to admin
job consumers.

Hydrogen-family expectation:

- expected labels: `FALSE` / `MOSTLY-FALSE`;
- expected truth: `5..25`;
- expected confidence: `65..85`.

Observed primary verdict:

- label: `FALSE`;
- truth: `18`;
- confidence: `72`.

This passes the hydrogen-family mechanical band and fixes the HJ20 lead-verdict
defect where the report led with `MIXED`.

## Containment

- Public/default job API does not expose the V2 report markdown.
- Public result JSON remains the pre-cutover damaged shell.
- No public verdict/truth/confidence is opened by this canary.
- The authenticated internal artifact routes returned JSON/no-store on
  preflight. Same-ledger process-local artifact routes did not retain artifacts
  for this job, but the report markdown was durably stored in the API job record
  and returned only to authenticated admin reads.

## Information Yield

`report produced`

This is the first verified default-manual-path V2 report after the UI/default
pipeline change.

## Remaining Quality Work

The next step should be report-quality review over the admin-visible V2 report,
not another readiness layer. Initial observed improvement targets:

- convert the internal Alpha wording toward the intended report surface when
  public cutover becomes eligible;
- improve citation/readability polish: the draft refers to EvidenceItem IDs but
  does not render user-friendly numbered citation markers;
- preserve the successful comparator alignment across at least one more
  Captain-defined input before treating HJ21 as broadly stable.

No second HJ21 canary is authorized by this result. Remaining HighJump live-job
budget after this run is `3`.
