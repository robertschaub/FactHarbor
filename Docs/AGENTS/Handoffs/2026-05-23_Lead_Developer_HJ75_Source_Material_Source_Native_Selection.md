# Lead Developer Handoff - V2 HighJump HJ75 Source Material Source-Native Selection

Date: 2026-05-23

Role: Lead Developer under Captain Deputy coordination

## Summary

HJ75 implements the Steer-Co/Claude-consented Source Material owner repair after
HJ74. HJ74 proved the chain reaches W5 and the internal report writer, but the
report remained `UNVERIFIED` because Source Material did not contain a
comprehensive current stock record for the `235000` threshold.

The implementation amends the existing Source Material selector only:

- includes bounded Serper XLSX source-material records in eligible
  Serper-provided records;
- prefers structurally stronger Serper material over preview fallback:
  XLSX text, linked-page text, then preview text;
- preserves provider-attempt balancing, dedupe, existing record/byte caps, and
  malformed-id fallback behavior.

No prompt/model/config/schema, provider expansion, cap increase, retry, parser,
cache/SR/storage, public behavior, ACS/direct URL, W5/W6/W7/W8/report-writer, or
V1 work was added.

## Files Touched

- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts`
- `Docs/WIP/2026-05-23_V2_HighJump_HJ75_Source_Material_Source_Native_Selection_Repair.md`

Status/backlog/current-lane/Agent Outputs/index may be updated in the same
closeout sequence before commit.

## Validation

Passed before closeout:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts`
  - 1 file, 20 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-serper-search-preview.test.ts`
  - 1 file, 10 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-xlsx-attachment-source-material.test.ts`
  - 1 file, 4 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`
  - 1 file, 96 tests.
- `npm -w apps/web run build`.
- `npm run validate:v2-gates`.
- `node scripts/validate-v2-gate-register.mjs --self-test`.

Final closeout checks passed and the implementation was committed at
`522beebb9fe36c89e011777118e6fcde6ece0c50`.

## V2 Scorecard Impact

Quality dimension advanced: V2-Q2 evidence acquisition and V2-Q3 EvidenceItem
quality.

Direct user/report value: improves the chance that W5 receives source-native
bounded Source Material rather than preview-only search fragments.

Hidden-only value: uses HJ73/HJ74 attribution to repair the upstream source
quality owner without adding another diagnostic mechanism.

Cost/latency impact: no new provider call, retry, cap, prompt, model, or parser
work.

Retirement or simplification unlocked: avoids a parallel source-ranking
mechanism by keeping the existing Source Material selector as the owner.

Scorecard risk: if the canary still lacks the current-stock aggregate, stop and
move to provider/query strategy instead of stacking another selector tweak.

## V2 Retirement Ledger Impact

Rows touched:

- V2-RL-021: keep HighJump temporary lowering under report-evidence control.
- V2-RL-024: keep/merge HJ37 bounded Serper linked-page Source Material; HJ75
  folds XLSX/source-native selection into the same selector owner.

No status change and no new mechanism owner.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism`.

Chosen option: amend the existing Source Material selector.

Rejected path and why: prompt repair, W5/report-writer repair,
provider/cap/retry expansion, semantic source ranking, parser/cache/SR/storage,
public behavior, ACS/direct URL, and V1 work were broader or wrong-owner paths.

What was removed/simplified: none.

What was added: one structural material-kind rank helper plus focused tests.

Net mechanism count: unchanged.

Budget reconciliation: diff stayed in one existing runtime owner plus one
focused test; no new route, sink, provider, cap, retry, prompt/config/schema, or
public surface.

Verification: focused tests, boundary guard, build, V2 gate validation, and
gate-register self-test passed; final closeout checks pending at handoff write.

Debt accepted and removal trigger: none.

Residual debt: advisory V2 footprint, boundary guard size, docs footprint, and
consolidation-marker warnings remain.

## Runtime Canary Attempt

The first HJ75 submission after commit was invalidated by runtime-auth setup,
not by analyzer behavior:

- job: `bdde6d4ad58544bcbf07576c7cf89968`;
- status: `FAILED`;
- classification: `INVALID_X7_HJ75_RUNTIME_AUTH_TRIGGER_MISS`;
- input: `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`;
- job `gitCommitHash` / `createdGitCommitHash`: `522beebb`;
- `executedWebGitCommitHash`, `promptContentHash`, `resultJson`, and
  `reportMarkdown`: null.

The API accepted the job, then the Web internal runner trigger returned
`401 Unauthorized`, so analyzer execution never started. This job consumed one
live-job slot but is analytically invalid and must not be used as Source
Material/report evidence.

Runtime auth was corrected by restart hygiene only; no source behavior changed.
`/api/internal/run-job` with the configured runner key now returns
`400 Missing jobId`, and `/api/admin/test-config` with the configured admin key
returns `200`.

Steer-Co consented to one replacement HJ75 canary after this failure/provenance
record is committed and fresh health/auth/provenance preflight passes. If that
replacement fails before analyzer execution again or lacks provenance, stop for
Captain.

## Next Step

Run exactly one replacement HJ75 canary with the Captain-defined input:

`Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`

Pass requires public containment, HJ73 attribution, and stronger source-native
Source Material composition than HJ74 or a clear attribution-based pivot to
provider/query strategy. Do not run a second replacement HJ75 canary without
separate package/approval.
