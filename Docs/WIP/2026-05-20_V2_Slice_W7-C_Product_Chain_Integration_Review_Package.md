# V2 Slice W7-C Product Chain Integration Review Package

Date: 2026-05-20
Status: Steer-Co review package; no implementation until accepted
Author: Captain Deputy / Steer-Co
Source state:
- W6-C2 product sufficiency owner committed at `ca0a96fa`
- W7-B2 product boundary/verdict owner committed at `ae7b681b`

## 1. Purpose

W6-C2 and W7-B2 now exist as product-owned runtime owners, but the V2 product
orchestrator still stops after W5 bounded EvidenceItem extraction. W7-C should
connect the existing product-route chain from W5 through W5-F, W6-B, W6-C2,
W7-A, W8-A, and W7-B2.

This is the first chain-integration step after the split owner sequence. It is
not a live-job package and not a public/report/cutover package.

## 2. Decision

Recommended next implementation:

1. In the product V2 orchestrator, after W5 bounded extraction and its existing
   W5 artifact/admission record, build the existing W5-F EvidenceItem handoff.
2. Build W6-B sufficiency intake from W5-F.
3. Execute W6-C2 sufficiency assessment owner.
4. Build W7-A boundary/verdict candidate contract.
5. Build W8-A internal Alpha report stop candidate as closure evidence.
6. Execute W7-B2 boundary/verdict execution owner.

Rejected for this slice:

- new artifact sink, route, or public/default-admin projection;
- W8-B report wrapper;
- live job/canary;
- prompt/model/config/schema/UCM/gateway edits;
- Source Reliability, truth/confidence formulas, or final report behavior.

Rationale: W7-C should make the real product chain executable before adding
more observability or report wrappers. Adding a new route/sink here would mix
execution integration with another hidden artifact mechanism.

## 3. Scope

Allowed files:

- `apps/web/src/lib/analyzer-v2/orchestrator.ts`
- `apps/web/test/unit/lib/analyzer-v2/orchestrator-w7c-product-chain.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- status, backlog, handoff, Agent_Outputs, and generated index updates

Allowed behavior:

- call existing W5-F, W6-B, W7-A, W8-A builders;
- call existing W6-C2 and W7-B2 product runtime owners;
- preserve the public damaged/precutover envelope exactly;
- keep all chain decisions internal to the current process scope;
- add focused tests that mock owner/provider outcomes and prove chain ordering,
  fail-closed behavior, and public non-exposure;
- `orchestrator-w7c-product-chain.test.ts` must mock
  `@/lib/analyzer-v2-runtime/evidence-lifecycle-sufficiency-assessment-owner`
  and
  `@/lib/analyzer-v2-runtime/evidence-lifecycle-boundary-verdict-execution-owner`
  at the module boundary, because W6-C2/W7-B2 owners intentionally do not
  expose injectable provider seams;
- add boundary-guard coverage that W7-C adds only orchestrator imports/calls
  for the approved chain and no route/public/report/export imports.

Forbidden behavior:

- no new artifact sink or route;
- no internal admin route, no public/default-admin projection, and no hidden
  chain ledger;
- no live job/canary;
- no W8-B report wrapper or generated report prose;
- no public API/UI/report/export/compatibility behavior;
- no prompt text, schema, model policy, cache policy, UCM, gateway approval, or
  config edits;
- no changes to owner input types, owner provider-call sites, or owner Anthropic
  SDK imports;
- no parser execution;
- no EvidenceItem generation changes;
- no Source Reliability, cache read/write, durable storage, truth/confidence
  formulas, warning publication, or final verdict behavior;
- no provider expansion, retries, W2/W3 widening, ACS/direct URL support, V1
  work, V1 cleanup, or cutover.

## 4. Chain Contract

W7-C may add this product-route sequence after W5 bounded extraction:

```text
boundedEvidenceExtraction
  -> boundedEvidenceExtractionArtifact.boundedEvidenceItemAdmission
  -> buildEvidenceItemHandoffDecision(...)
  -> buildSufficiencyIntakeDecision(...)
  -> runSufficiencyAssessmentDecision(...)
  -> buildBoundaryVerdictCandidateDecision(...)
  -> buildInternalAlphaReportStopCandidate(...)
  -> runBoundaryVerdictExecutionDecision(...)
```

Rules:

- If `recordBoundedEvidenceExtractionRuntimeArtifact(...)` returns null, W7-C
  may still build W5-F only if it has the required W5-E admission decision
  available without weakening provenance. Otherwise stop the chain silently and
  keep public output unchanged.
- W6-C2 and W7-B2 owner return values must not be added to public result JSON,
  compatibility projections, reports, UI, exports, logs, or errors.
- The chain must live inside the existing hidden runtime `try` block, so any
  W6/W7 failure keeps public V2 damaged/precutover and does not break the job.
- Do not catch and reinterpret W6-C2/W7-B2 semantic statuses. Let their owners
  and core runtimes classify blocked/damaged states.
- Do not import W4-I routes/sinks/provenance directly.

## 5. V2 Scorecard Impact

Scorecard dimension: first internal report-value chain reachability.

Direct report value: moderate and still internal-only. W7-C makes the product
route execute the existing sufficiency and boundary/verdict LLM owners, which
is required before internal Alpha report synthesis can carry real report value.

Quality priority: preserve LLM-owned semantic decisions and avoid deterministic
semantic selection, compression, boundary grouping, verdict formulas, warning
severity, or truth/confidence calculations.

## 6. V2 Retirement Ledger Impact

Rows touched:

- W6-C2 and W7-B2 become consumed product owners rather than isolated adapters.
- W7-A remains temporary scaffolding but is now on the path to retirement after
  W7-B2 chain verification.

Retirement pressure:

- Do not clone provider-call or prompt-rendering logic in the orchestrator.
- Do not add a parallel chain artifact or route in this slice.
- The next package should evaluate whether W7-A can be merged/retired after
  W7-C local verification and before or during W8-B.

## 7. V2 Consolidation Gate

Latest `npm run debt:sensors`: known `advisory_warn` after W7-B2 with V2
source/test footprint, boundary guard size, docs volume, net-mechanism, and
consolidation-marker warnings.

Net mechanism increase: limited. W7-C adds orchestration calls, not a new
semantic owner, route, sink, or artifact store.

Missing-capability rationale: W6-C2 and W7-B2 are useless for product progress
unless the product route can invoke them. Existing owners already carry the
provider and provenance responsibilities; W7-C must consume them instead of
creating new mechanisms.

Removal/merge trigger: if W7-C passes, the next package must add hidden chain
observability by artifact sink, internal admin ledger projection, or W8-B report
wrapper that carries the chain's hidden output. A second consecutive sink-less
integration slice requires an explicit Steer-Co exception. The next package
should also evaluate whether W7-A can be merged/retired after W7-C local
verification and before or during W8-B.

## 8. Verifier Plan

Required implementation verifiers:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/orchestrator-w7c-product-chain.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-sufficiency-assessment-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-boundary-verdict-execution-owner.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run debt:sensors
npm -w apps/web run build
git diff --check
git status --short --untracked-files=all
```

No expensive LLM tests and no live jobs are authorized.

The orchestrator W7-C test must not contact Anthropic or any provider network.
It must use module mocks for W6-C2 and W7-B2 owners and assert mock invocation
counts.

## 9. Pass Criteria

- Product orchestrator invokes W6-C2 and W7-B2 only after W5 bounded extraction
  and W5-F/W6-B/W7-A/W8-A construction.
- Chain precondition gate: orchestrator invokes the W5-F builder only when W5
  bounded extraction is accepted, `recordBoundedEvidenceExtractionRuntimeArtifact(...)`
  returns non-null, and the W5 decision is runtime-owned. This is required
  because downstream W7-B2 input relies on W5-F source-material lineage,
  provider id, and model id.
- W6-C2 and W7-B2 are consumed directly; no provider/prompt logic is cloned in
  the orchestrator.
- Public V2 result remains `4.0.0-cb-precutover` / `blocked_precutover` /
  damaged, with no W6/W7 hidden decision text or internal status leak.
- Fail-closed envelope test: if `runSufficiencyAssessmentDecision(...)` or
  `runBoundaryVerdictExecutionDecision(...)` throws, the public envelope remains
  byte-identical to the current damaged/precutover output shape and no new error
  text leaks.
- Chain execution remains inside the existing hidden runtime containment block.
- No new route/sink/artifact store is added.
- Boundary guard confirms no public/API/UI/report/export/compatibility surface
  imports the new owners or chain state.

## 10. Stop / Escalation Triggers

Stop and reconvene Steer-Co if:

- W7-C requires a new artifact sink, route, or public/default-admin projection
  to be meaningful;
- W7-C requires prompt/model/config/schema/UCM/gateway edits;
- W7-C requires W8-B report wrapper behavior;
- owner results cannot be sequenced without cloning provider or prompt logic;
- tests need live jobs to prove local behavior;
- focused verifier failure root cause is unclear after one debt-guard pass;
- chain integration requires direct W4-I route/sink/provenance access;
- implementation grows beyond orchestrator chain calls, one focused test, and
  boundary guard maintenance.

Escalate to Captain only if Steer-Co cannot consent, if a live job is requested
before a separate canary package, or if a hard approval gate is hit.
