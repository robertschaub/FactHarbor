# V2 Slice X7-W5-B Claim Understanding Activation Repair Package

Date: 2026-05-19
Status: locally implemented / verifier-clean / no live job run

## Purpose

W5-A value validation cannot proceed while direct-input Claim Understanding is still closed at the gateway policy level. Recent canaries reached `SUCCEEDED` public jobs but either stopped at Claim Understanding (`no_valid_claim`) or returned the plain shell-only envelope with no durable hidden-chain artifact evidence.

Local code inspection shows the direct cause:

- `apps/web/src/lib/analyzer-v2/gateway/policy.ts`
  - `claim_understanding_gate1` has no `status: "executable"`.
  - `claim_understanding_gate1` has no approved prompt policy attached.
- `apps/web/src/lib/analyzer-v2/gateway/model-policy-registry.ts`
  - `v2.model.claim_understanding_gate1.0` has `approval: MISSING_APPROVAL`.
- `apps/web/src/lib/analyzer-v2/gateway/cache-policy-registry.ts`
  - `ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_POLICY` has `approval: PENDING_APPROVAL`.
- `apps/web/src/lib/analyzer-v2/claim-understanding/runtime-stage.ts`
  - `buildRuntimeApprovalSnapshotFromGatewayTask()` requires executable gateway status plus approved prompt/model/cache policies before dispatch.

This package requested and received Captain approval for the smallest repair that makes the already-existing direct-input Claim Understanding runtime path reachable under the same hidden/internal containment model.

## Implementation Status

X7-W5-B is locally implemented as an approval-state repair only:

- `claim_understanding_gate1` is now `executable`.
- Claim Understanding prompt/model/cache policies all use the durable approval anchor `Docs/AGENTS/Handoffs/2026-05-19_Captain_X7-W5-B_Claim_Understanding_Activation_Approval.md#approval-anchor`.
- Legacy scaffold options still fail closed without product-owned runtime activation.
- The V2 gate register mirrors the new hidden/internal Claim Understanding execution state but remains audit-only and does not grant execution.

Local verifiers are clean:

- focused gateway/runtime/boundary tests passed;
- full `test/unit/lib/analyzer-v2` passed;
- V2 gate validation and gate-register self-test passed;
- `npm run debt:sensors` completed with advisory warnings only;
- `npm -w apps/web run build` passed;
- `git diff --check` passed.

No live job has been run from this package. Any canary still requires commit, clean runtime refresh/preflight, and live-job ledger accounting.

## Proposed Scope

Approved implementation scope:

- Add a durable repo-local X7-W5-B approval record for `claim_understanding_gate1`.
- Set `claim_understanding_gate1` to executable using that approval record.
- Attach the approval record to the Claim Understanding prompt/model/cache policy entries.
- Add or update focused tests proving:
  - direct-input Claim Understanding remains fail-closed without the approval triple;
  - the approved triple makes the gateway executable;
  - no public result/report/export/compatibility exposure is opened;
  - default admin artifacts remain hidden/internal and no-store;
  - no source text or prompt text leaks into public/default-admin/log/error surfaces.
- Add one post-implementation canary proposal using a Captain-defined clear factual input after verifier pass and runtime refresh.

Forbidden:

- prompt text edits;
- schema text edits;
- model/provider selection changes beyond attaching the approval to the existing policy;
- cache reads/writes or durable cache behavior;
- public API/UI/report/export/compatibility behavior;
- parser execution;
- report/verdict/warning/confidence behavior;
- provider expansion, W2/W3 widening, ACS/direct URL support;
- V1 reuse, cleanup, or removal.

## Exact Approval Boundary

This is an approval-flip package. It was implemented only after explicit Captain approval because prompt/model/cache approval flips are standing Captain gates.

The approval anchor should be a durable repo-local handoff, for example:

```text
Docs/AGENTS/Handoffs/2026-05-19_Captain_X7-W5-B_Claim_Understanding_Activation_Approval.md#approval-anchor
```

## Pass Criteria

- Focused gateway policy tests show `claim_understanding_gate1` executable only when prompt/model/cache approvals are all present.
- Runtime tests show direct-input Claim Understanding dispatch can proceed to the provider boundary under hidden/internal conditions.
- Boundary guards still reject V1 analyzer imports, public wiring, prompt/config/schema edits outside scope, raw text leakage, and unauthorized route exposure.
- Build and V2 gate validation pass.
- A post-implementation canary, if separately authorized after commit/runtime refresh, must produce durable hidden Claim Understanding artifact evidence or stop before any downstream W2-W5 claim is made.

## Stop Criteria

Stop and return to Captain / Steer-Co if:

- the repair requires prompt text, schema, model/provider, cache behavior, public surface, source/provider, parser, report, verdict, warning, confidence, ACS/direct URL, or V1 changes;
- local tests cannot prove the approval triple is the only activation change;
- default admin/public/log/error surfaces can expose raw claim text beyond already-approved input display;
- live-job artifact evidence remains missing after local route/runtime preflight;
- verifier failure root cause is unclear.

## Verifier Plan

Required before commit:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/gateway/policy.test.ts test/unit/lib/analyzer-v2/claim-understanding/runtime-stage.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm run validate:v2-gates
npm run debt:sensors
npm -w apps/web run build
git diff --check
```

Required before any later canary:

- committed implementation;
- clean git status;
- `/api/version` matches implementation commit;
- authenticated no-store internal route preflight passes;
- unauthenticated internal route denial passes;
- live-job tranche ledger debited before closeout.

## Canary Proposal

One later canary is worth spending from the remaining budget only after the local verifier set proves the activation path and the runtime has been refreshed. Recommended input:

```text
Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz
```

Expected first success signal:

- durable hidden Claim Understanding runtime artifact exists;
- downstream W2-W5 claims are made only if their authenticated no-store route artifacts exist for the same ledger;
- public V2 remains `4.0.0-cb-precutover` / `blocked_precutover`.

## V2 SCORECARD IMPACT

This package directly advances the scorecard toward real report-quality value because no downstream evidence/report quality can be validated until direct-input Claim Understanding can produce accepted claim contracts under durable hidden provenance.

## V2 RETIREMENT LEDGER IMPACT

- Does not retire W4-I by itself.
- Retires the false premise that W5-A has already run successfully on product route.
- Creates a concrete removal/merge trigger: if X7-W5-B canary proves durable Claim Understanding and downstream hidden artifacts, W4-I/W4-chain merge/delete can be reconsidered in a later package; if not, W4-chain cannot be treated as value-producing.

## V2 CONSOLIDATION GATE

This package does not add a new hidden mechanism. It activates an existing approved runtime path by making its gateway approval state consistent with the value-validation goal. It should reduce confusion by aligning policy state, runtime behavior, and canary evidence.

## Latest Debt Sensor Status

Command: `npm run debt:sensors`

Status: `advisory_warn`

Salient warnings:

- V2 source/test footprint and boundary guard size exceed advisory thresholds.
- WIP/handoff volume exceeds advisory thresholds.
- Debt-guard telemetry contains net mechanism increases.
- Five V2 consolidation-marker review files remain advisory warnings.

These warnings support a narrow activation repair rather than additional hidden machinery.
