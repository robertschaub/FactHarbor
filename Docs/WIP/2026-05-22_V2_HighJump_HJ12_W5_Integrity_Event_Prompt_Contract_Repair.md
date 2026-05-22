# V2 HighJump HJ12 W5 Integrity Event Prompt Contract Repair

Date: 2026-05-22  
Owner: Captain Deputy / Lead Developer lane  
Status: implemented locally, verifier-clean, canary pending source commit/runtime refresh

## Context

HJ11 repaired Source Material coverage structurally. Corrective V2 canary
`751c0cb864924ec1a2cbe697730a7b70` ran `claimboundary-v2` on runtime
`bf1f0011898956bb2efabd2044cfce9be30defb5` and proved that W3-A/W4/W5 can carry
nine bounded Source Material records, including one OpenAlex record plus
Wikimedia page summaries.

The canary then stopped at W5 bounded evidence extraction with
`damaged_execution` / `schema_validation_failed`. Sanitized diagnostics showed
the validation failure centered on `integrityEvents` shape. The
`V2_EVIDENCE_EXTRACTION` prompt section named `integrityEvents` as task events
but did not spell out the canonical event object contract, while adjacent
Evidence Lifecycle prompt sections already did.

## Decision

Implement HJ12 as an in-place prompt-contract alignment:

- add the canonical `Integrity event object` contract to `V2_EVIDENCE_EXTRACTION`;
- list the allowed blocked and damaged reasons in the same section;
- update the prompt-contract test so future edits cannot remove the event shape;
- do not change schemas, runtime code, gateway policy, model policy, Source
  Material fan-in, EvidenceItem semantics, or public behavior.

## Explicit Non-Scope

HJ12 does not add or change:

- source acquisition, provider expansion, retries, parser execution, cache,
  Source Reliability, or storage behavior;
- W3-B/W4/W5 fan-in limits or aggregate byte caps;
- TypeScript result schemas or gateway/model/cache approval state;
- deterministic evidence semantics or comparator heuristics;
- report/verdict/warning/confidence behavior;
- public API/UI/report/export/compatibility exposure;
- V1 reuse or cleanup.

## V2 Scorecard Impact

Quality dimension advanced: V2-Q3 Evidence extraction.  
Direct user/report value: unblocks hidden EvidenceItem extraction so later
internal Alpha report generation can use the broader HJ11 evidence set.  
Hidden-only value: keeps the W5 prompt aligned with the already-approved
structured output schema.  
Cost/latency impact: no new calls or retries; expected to reduce wasted W5
schema-failure jobs.  
Retirement or simplification unlocked: if the next canary succeeds, the W5-C
schema diagnostics can remain bounded stable telemetry rather than driving more
diagnostic slices.  
Scorecard risk: prompt edit may still be insufficient if the model emits another
schema mismatch, but the repair is topic-neutral and directly tied to sanitized
failure paths.

## V2 Retirement Ledger Impact

Rows touched:

- V2-RL-021 HighJump temporary bar-lowering prompt/gate loosenings: keep. HJ12
  is not a lowering; it is a schema-contract clarification needed to continue
  the HighJump report path.
- V2-RL-022 W7-B/W8-B diagnostics: no status change.

Status changes: none.  
New mechanism owner: none.  
Removal / merge trigger: after two successive W5 canaries no longer fail on
`integrityEvents`, keep the prompt contract and fold any remaining W5-C
diagnostic notes into stable telemetry.  
Debt accepted: none beyond the existing HighJump live-job tranche pressure.

## V2 Consolidation Gate

Accepted as a bounded amendment because it changes one existing prompt section
and one existing prompt-contract test. Net mechanism count is unchanged. It does
not add a fallback, retry, route, diagnostic, or hidden artifact.

## Debt-Guard Result

Classification: incomplete-existing-mechanism  
Chosen option: amend the existing `V2_EVIDENCE_EXTRACTION` prompt contract in
place  
Rejected paths:

- schema widening, because the schema already has a clear event object contract;
- runtime post-processing, because it would mask malformed LLM output and add
  repair machinery;
- another source-coverage repair, because HJ11 already carried nine records to
  W5.

Net mechanism count: unchanged  
Residual risk: model output may reveal another schema mismatch after the event
contract is fixed.  
Removal/merge trigger: none; the prompt section should permanently state the
schema-owned event contract.

## Verifier Results

Completed before commit:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-owner.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts/route.test.ts` - pass, 4 files / 23 tests
- `npm run validate:v2-gates` - pass
- `node scripts/validate-v2-gate-register.mjs --self-test` - pass
- `npm run debt:sensors` - `advisory_warn` with known V2 footprint/docs/boundary-guard/consolidation warnings
- `git diff --check` - pass
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime test/unit/lib/analyzer-v2` - pass, 142 files / 859 tests
- `npm -w apps/web run build` - pass; reseed reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`

## Canary Plan

After source commit and runtime refresh, run at most one HJ12 live canary using
the Captain-defined input:

`Using hydrogen for cars is more efficient than using electricity`

Pass criteria:

- runtime commit equals the HJ12 source commit;
- submitted variant is exactly `claimboundary-v2`;
- public V2 remains `4.0.0-cb-precutover` / `blocked_precutover`;
- W3/W4 still carry the HJ11 nine-record hidden Source Material set;
- W5 no longer fails schema validation on `integrityEvents`;
- if W5 succeeds, downstream W6/W7/W8 behavior is classified from actual hidden
  artifacts, not assumed;
- no public/default-admin/log/error leak of prompt text, source text,
  EvidenceItem text, provider payload, hidden ledger id, or internal draft text.

Stop/pivot criteria:

- W5 still fails schema validation;
- W5 succeeds but downstream W6/W7/W8 stops on a new contract issue;
- any public/default-admin/log/error text leak;
- stale runtime, wrong variant, or missing hidden ledger provenance.
