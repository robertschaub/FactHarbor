# V2 Slice X7-W5-E EvidenceItem Admission Canary Result

Date: 2026-05-20
Status: stopped; not passed
Author: Captain Deputy / Lead Developer

## Classification

`STOP_X7_W5_E_MISSING_ADMISSION_SNAPSHOT`

## Authority

Canary package:
`Docs/WIP/2026-05-20_V2_Slice_X7-W5-E_EvidenceItem_Admission_Canary_Execution_Package.md`

The package authorized exactly one product-route canary using the exact
Captain-defined input below and explicit `claimboundary-v2`.

## Job

- Job id: `68f7dba28c9441b7ab702e5a7b2c1a17`
- Input: `Using hydrogen for cars is more efficient than using electricity`
- Submitted pipeline variant: `claimboundary-v2`
- Submission result: `QUEUED`
- Final job status: `SUCCEEDED`
- Runtime result metadata commit:
  `51b2264d7360a1b4176cfa9faef80c0d8fb3ad0d`
- Canary budget consumed: `1`
- Remaining live-job budget after this canary: `3`

## Public Result

Public containment held:

- `_schemaVersion = 4.0.0-cb-precutover`
- `publicCutoverStatus = blocked_precutover`
- `analysisIssueCode = report_damaged`
- public `shellOnly = true`
- public `analyticalStagesExecuted = []`
- no public EvidenceItems were produced

This is not a W5-E pass because the repaired W5 internal route shows accepted
W5 EvidenceItems but a damaged W5-E admission projection:
`missing_runtime_admission_snapshot`.

## Event History

The job event trail recorded:

- job created
- runner triggered and started
- input prepared with `pipeline: claimboundary-v2`
- Analyzer V2 orchestrator initialized
- Analyzer V2 damaged structural envelope generated
- result stored

The public event trail is intentionally sparse for the pre-cutover shell and is
not sufficient on its own to prove or disprove hidden-chain execution. Same-ledger
hidden routes are the authority.

## Hidden Artifact Inspection

The first hidden-route loop used a PowerShell interpolation bug (`$r?ledgerId`),
so its `text/html` 404 observations are not authoritative. Corrected route
checks with `${r}` and an encoded ledger id showed the hidden chain is reachable
before W5:

- `claim-understanding-runtime-artifacts`: `200 application/json`
- `evidence-lifecycle-intake-artifacts`: `200 application/json`
- `evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts`:
  `200 application/json`
- `evidence-lifecycle-source-material-page-summary-artifacts`:
  `200 application/json`
- `evidence-lifecycle-bounded-evidence-extraction-artifacts`: initially `500`,
  then `200 application/json` after local fail-closed projection repair

The Next development log recorded `TypeError: Cannot read properties of
undefined (reading 'sideEffects')` for the W5 route. Local diagnosis traced this
to the W5 default projection assuming every stored W5 artifact already has the
new W5-E `boundedEvidenceItemAdmission` snapshot.

After the local repair, the same canary ledger showed:

- W5 `status = hidden_evidence_item_extraction_completed`
- W5 `extractionResultStatus = accepted`
- W5 `evidenceItemCount = 2`
- W5-E `admissionStatus = evidence_item_admission_damaged`
- W5-E `damagedReason = missing_runtime_admission_snapshot`
- W5-E `admittedEvidenceItemCount = 0`
- default route redaction flags stayed false for EvidenceItem, source, and input
  text

## Pass / Stop Evaluation

Pass criteria not met:

- W5-E admission snapshot was missing from the live artifact.
- W5-E admission was damaged, not accepted.
- Same-ledger parent artifact inspection could not confirm W4-H/W4-I/W5 lineage.

Stop criterion triggered:

- W5-E admission absent/damaged:
  `missing_runtime_admission_snapshot`.

No second W5-E canary is authorized by this package.

## V2 Scorecard Impact

No new report-quality value was proven. The result confirms public containment
but does not validate EvidenceItem admission.

Quality dimension advanced: none.
Direct user/report value: none.
Hidden-only value: W5 accepted EvidenceItems were present, but W5-E admission
was not recorded in the live artifact.
Cost/latency impact: one live job consumed.
Retirement or simplification unlocked: none; W4-I route removal trigger remains
unsatisfied.
Scorecard risk: route robustness is repaired locally, but W5-E still needs a
fresh committed/refreshed canary to prove admission is recorded at runtime.

## V2 Retirement Ledger Impact

Rows touched: `V2-RL-009`, `V2-RL-012`.

Status changes: none.

New mechanism owner: none.

Removal / merge trigger: not satisfied. W5-E admission and parent-chain
inspection were not proven, so W4-I standalone route/sink must remain active.

Debt accepted: none.

## V2 Consolidation Gate

Latest debt-sensor status: `advisory_warn` on
`2026-05-20T08:19:41.666Z`.

This result led to a narrow local fail-closed route repair: missing W5-E
admission snapshots now produce a damaged internal admission projection rather
than a route exception. This does not validate W5-E and does not authorize
another live job.

## Next Action

Commit the local W5 route fail-closed repair and treat W5-E admission as still
unproven. Any fresh W5-E canary requires a separate approval package after the
repair commit and runtime refresh.

No public behavior, parser, report/verdict/warning/confidence behavior,
cache/SR/storage, provider expansion, ACS/direct URL, V1 work, or second W5-E
canary is authorized by this result.

## Local Repair Verification

The local W5 route projection repair was verified without spending another live
job:

- focused W5 route/admission/sink tests: `3` files / `13` tests passed
- boundary guard: `1` file / `87` tests passed
- `npm run validate:v2-gates` passed
- `npm -w apps/web run build` passed
- `git diff --check` passed

Debt-guard result: amend existing W5 artifact projection in place; do not add a
new route, synthesize a passing W5-E admission from a missing snapshot, or spend
another canary. Net mechanism count unchanged.
