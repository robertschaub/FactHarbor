# V2 HighJump HJ11 Source Material Coverage Repair

Date: 2026-05-22  
Owner: Captain Deputy / Lead Developer lane  
Status: implemented, verifier-clean, canary completed with W5 schema stop

## Context

HJ10 repaired the selected AtomicClaim context path and produced an internal alpha draft with no off-comparator true verdict. The remaining report-quality gap is source coverage: W2/W3-A observed electric-side Wikimedia candidates, but W3-B and the downstream hidden corpus/extraction-input fan-in could still carry only six Source Material records.

Steer-Co reached consent on a bounded amendment, not a new hidden mechanism: preserve more already-observed candidates through the existing W3-B/W4/W5 structural path, then re-run one canary.

## Decision

Implement HJ11 as an in-place structural coverage repair:

- Deduplicate W3-B page-summary locators by provider plus page-key hash, not provider plus locator ref plus page-key hash.
- Raise W3-B Wikimedia page-summary fetch budget from 6 to 9, aligned to the existing W3-A preview cap.
- Treat one eligible OpenAlex Source Material record as part of the same nine-record total budget.
- Carry the corresponding hidden record fan-in limits from 6 to 9 through W4-A, W4-G, and W4-H.
- Keep aggregate text byte caps unchanged; if the canary fails only because the aggregate cap is too low, that is a separate HJ12 decision.

## Explicit Non-Scope

HJ11 does not add or change:

- query planning caps or source-acquisition query volume
- provider expansion
- retries
- parser execution
- cache, Source Reliability, or storage behavior
- prompt, model, config, schema, UCM, or gateway changes
- extraction semantics or EvidenceItem schema
- report/verdict/warning/confidence behavior
- public API/UI/report/export/compatibility exposure
- V1 reuse or cleanup

## V2 Scorecard Impact

HJ11 directly advances report-quality value by increasing the chance that the hidden internal alpha report has balanced comparator-side Source Material before EvidenceItem extraction and boundary verdict generation. It is still infrastructure progress until a canary shows improved coverage.

## V2 Retirement Ledger Impact

No mechanism is retired in this slice. The change amends existing mechanisms and avoids adding a parallel selector, fallback, route, or diagnostic path. The repair reduces pressure to add later compensating report-layer heuristics.

## V2 Consolidation Gate

Accepted as a bounded amendment because it changes existing fan-in limits and dedupe logic only. Net mechanism count is unchanged. The cap increase is limited to the already-approved W3-A preview envelope and the downstream structural holders needed to preserve the same records.

## Debt-Guard Result

Classification: incomplete-existing-mechanism  
Chosen option: amend existing W3-B/W4/W5 fan-in and dedupe  
Rejected path: add a semantic selector, retry, provider, or report-layer workaround; that would increase machinery without fixing the observed truncation path  
Net mechanism count: unchanged  
Debt accepted: explicit W3-B cap remains a structural constant, not UCM; this is acceptable for HighJump hidden-only structural fan-in and should be revisited before public product tuning  
Removal/merge trigger: once V2 reaches stable report quality, consolidate hidden HighJump caps into the production UCM/config model or retire the temporary HighJump ladder language

## Verifier Plan

Required before source commit:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-readiness.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-admission.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/evidence-corpus-shell.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/bounded-text-authorization.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime test/unit/lib/analyzer-v2`
- `npm run validate:v2-gates`
- `node scripts/validate-v2-gate-register.mjs --self-test`
- `npm run debt:sensors`
- `npm -w apps/web run build`
- `git diff --check`

## Canary Plan

After source commit and runtime refresh, run exactly one HJ11 live canary using the Captain-defined input:

`Using hydrogen for cars is more efficient than using electricity`

Pass criteria:

- runtime commit equals the HJ11 source commit
- public V2 remains `4.0.0-cb-precutover` / `blocked_precutover`
- W3-B carries up to nine total Source Material records, including OpenAlex if present
- W4/W5 carry the same bounded hidden source set without raw public/default-admin leakage
- internal alpha draft no longer lacks electric-side material due to W3-B/W4/W5 fan-in truncation
- no parser/cache/SR/storage/public exposure/provider expansion/V1 work

Stop/pivot criteria:

- zero or no improved comparator-side Source Material after HJ11
- aggregate text cap blocks otherwise useful material
- any public/default-admin/log/error text leak
- canary produces a new failing verifier or stale-runtime provenance gap

## Canary Result

Corrective V2 canary:

- job id: `751c0cb864924ec1a2cbe697730a7b70`
- runtime commit: `bf1f0011898956bb2efabd2044cfce9be30defb5`
- submitted variant: `claimboundary-v2`
- classification:
  `PASS_X7_HJ11_SOURCE_MATERIAL_COVERAGE_REPAIR_W5_SCHEMA_STOP`

HJ11 passed its structural coverage goal: W3-A/W4/W5 carried nine hidden Source
Material records, including one OpenAlex record plus Wikimedia records. It then
stopped at W5 `damaged_execution` / `schema_validation_failed` on
`integrityEvents`, which HJ12 repaired.

Operational note: two earlier HJ11 submissions used the V1 `claimboundary`
variant and are not V2 evidence. They are recorded in the live-job ledger as
budget-consuming wrong-variant misses.
