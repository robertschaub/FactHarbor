# V2 HighJump HJ70 - W5 Output Contract Repair

Status: local implementation verifier-clean; live rerun pending committed prompt import/runtime refresh

## Objective

Repair the HJ69 W5 `evidence_extraction` schema-validation stop for the
Captain-defined current-asylum input while preserving the HighJump path toward
complete internal V2 reports.

## Authority

Captain authorized HighJump continuation, prompt edits, schema changes when
naturally needed, and live jobs within the active tranche. HJ70 uses the
lowest-net-complexity path and does not require schema changes unless local
verification disproves prompt-contract repair.

## Evidence

HJ69 job `9b37bbdf944d478b8bfc20193725c969` repaired the W4-I Unicode length
readiness stop and reached W5. W5 failed closed as `damaged_execution` /
`schema_validation_failed` with diagnostics including:

- `evidenceItems` too big;
- invalid `provenance.rationale` type;
- unrecognized `provenance` keys;
- invalid top-level `status` / `extractionStatus` literals.

Upstream W4-H/W4-I state was structurally eligible, so the current owner is W5
output-contract adherence.

## Scope

Allowed:

- amend `## V2_EVIDENCE_EXTRACTION` in `apps/web/prompts/claimboundary-v2.prompt.md`;
- add focused prompt-contract assertions;
- update this package, status, ledger, Agent Outputs, and indexes after
  validation.

Closed:

- schema relaxation;
- cap increase;
- source/provider widening or filtering;
- retries or fallback repair loops;
- parser, cache, Source Reliability, storage, ACS/direct URL, V1 work;
- report writer, verdict, warning, confidence, public/API/UI/export changes.

## Debt-Guard

DEBT-GUARD INVENTORY

- Symptom: W5 live provider output failed strict schema validation after W4-I
  became structurally eligible.
- Verifier: HJ69 live artifact for job
  `9b37bbdf944d478b8bfc20193725c969`.
- Likely recent change surface: existing W5 output-contract prompt in
  `claimboundary-v2.prompt.md`.
- Existing mechanisms: strict `EvidenceExtractionResultSchema`, W5 prompt
  branch rules, prompt-contract tests, fail-closed W5 runtime diagnostics.
- Debt signals: the prompt already contains the contract, but the large source
  packet still produced invalid item cardinality/provenance/literal shape.
- Constraints: topic-neutral prompt language; no deterministic semantic text
  logic; no public/default text leak; Captain-defined live input only.
- Unknowns: whether prompt hardening alone will make the live provider comply.

Classification: `incomplete-existing-mechanism`.

Chosen option: amend the existing W5 prompt contract and tests in place.

Rejected options:

- schema relaxation: would weaken strict contract and bless invalid output;
- cap increase: would move the problem downstream and is not justified by
  report-quality evidence;
- source filtering/provider changes: upstream produced usable packets and the
  failing diagnostics are output-shape issues;
- retries/fallbacks: would add mechanism before fixing the contract.

Complexity budget:

- Files expected to change: prompt, prompt-contract test, this WIP package.
- Net mechanisms: unchanged.
- New branches/fallbacks/flags/helpers: none.
- Verifier tier: safe-local, build, then one focused live-job rerun after
  commit/runtime refresh because prompt compliance must be proven on the
  observed large-packet failure.
- Debt accepted: none.

## V2 Scorecard Impact

Advances internal report reachability for current/high-volume source packets by
keeping W5 evidence extraction on the strict schema path instead of stopping
before sufficiency and report generation.

## V2 Retirement Ledger Impact

No mechanism is retired in this slice. HJ70 prevents a new parallel repair path
by strengthening the existing W5 prompt contract rather than adding schema
relaxation, retries, or filtering.

## Consolidation Gate

Net hidden machinery remains unchanged. If the focused rerun repeats the same
schema failure, stop and reconvene Steer-Co for a schema-guided W5 output repair
or source-packet compaction decision.

## Verifier Plan

Run before commit:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `npm -w apps/web run build`
- `npm run debt:sensors`
- `npm run index`
- `git diff --check`
- `git diff --cached --check`

After commit, import/activate/reseed the prompt as needed, refresh runtime,
verify Web/API commit and active prompt hash, then run exactly one focused live
rerun using:

`Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`

## Pass / Stop Criteria

Pass:

- focused tests/build/diff checks pass;
- live rerun stays on `claimboundary-v2`;
- public/default containment holds;
- W5 no longer fails for `evidenceItems` cardinality, provenance shape, or
  top-level status/extractionStatus literals.

Stop:

- repeated same W5 schema failure after prompt activation;
- stale runtime/source or stale prompt hash;
- V1 routing;
- public/default leak;
- pressure to change schema/caps/source/provider/report writer before the
  focused W5 contract question is answered.

## Local Implementation Result

Implemented as a prompt/test amendment only:

- strengthened the W5 EvidenceItem cardinality instruction from preference to
  hard schema maximum;
- made `provenance.rationale` explicitly one string and forbade extra
  `provenance` keys;
- made accepted-branch status/extractionStatus literals explicit and rejected
  alternate success/completion/partial branch strings;
- added focused prompt-contract assertions.

Verifier results:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction.test.ts`
  passed: 2 files, 17 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`
  passed: 1 file, 96 tests. The earlier combined command hit the shell
  timeout because this guard takes about 158 seconds; the split verifier passed.
- `npm -w apps/web run build` passed. Postbuild reseed reported no prompt DB
  change, so the live step must explicitly verify/import/activate the intended
  `claimboundary-v2` prompt hash before submission.
- `npm run debt:sensors` returned `advisory_warn` only for known V2 footprint,
  boundary guard size, docs footprint, net mechanism telemetry, and
  consolidation-marker warnings.
- `npm run index` passed.
- `git diff --check` and `git diff --cached --check` passed before commit.

DEBT-GUARD RESULT

- Classification: `incomplete-existing-mechanism`.
- Chosen option: amend existing W5 prompt contract and prompt-contract tests.
- Rejected path and why: schema relaxation, caps, source/provider filtering,
  retries, and report-writer changes would add mechanism or move the stop
  without addressing the observed output-shape failure.
- What was removed/simplified: no removal; no new path added.
- What was added: stricter wording inside the existing W5 prompt section and
  assertions for that wording.
- Net mechanism count: unchanged.
- Budget reconciliation: touched only expected prompt/test/package files.
- Verification: focused tests, boundary guard, build, debt sensors, index, diff
  checks.
- Debt accepted and removal trigger: none.
