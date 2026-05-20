# V2 Slice W6-C2 Sufficiency Product Runtime Owner Review Package

Date: 2026-05-20
Status: Steer-Co-consented implementation package; no live job
Author: Captain Deputy / Steer-Co
Review: Claude Opus 4.6 Steer-Co follow-up consented to splitting product
runtime ownership into W6-C2 first, W7-B product ownership second, and chain
integration third.

## 1. Purpose

W7-B core boundary/verdict execution is implemented at `94b171b7`, but the
product V2 route cannot exercise it yet. Code inspection confirmed the product
orchestrator currently reaches W5 bounded EvidenceItem extraction and records
W5 artifacts, then returns the pre-cutover damaged envelope. W6-C sufficiency
and W7-B boundary/verdict execution are core runtimes with injected provider
calls; they do not yet have product-owned runtime provider adapters like W5.

This package authorizes the next balanced step only: add one product-owned W6-C
sufficiency runtime owner that wraps the existing core
`runSufficiencyAssessmentRuntime(...)` with the same bounded provider-adapter
pattern used by W5.

## 2. Decision

Steer-Co rejected an immediate W7-B live canary because W7-B is not reachable
from the product route. Steer-Co also rejected a combined W6-C + W7-B + chain
artifact package because it would bundle two new provider adapters plus a chain
artifact in one debt-sensitive slice.

Approved sequence:

1. W6-C2 product runtime owner.
2. W7-B2 product runtime owner.
3. Product-route chain integration and then one canary package.

## 3. Scope

Allowed files:

- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-sufficiency-assessment-owner.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-sufficiency-assessment-provenance.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-sufficiency-assessment-owner.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- status, backlog, handoff, Agent_Outputs, and generated index updates

Allowed behavior:

- wrap `runSufficiencyAssessmentRuntime(...)` with a product-owned Anthropic
  provider adapter modeled on W5;
- validate product-owned activation snapshot before provider execution;
- validate model policy snapshot against the W6-C `evidence_sufficiency` task;
- build a W6-C config snapshot hash from source package, provider factory
  version, activation snapshot, gateway task, task model policy, and model
  policy snapshot hash;
- mark returned `SufficiencyAssessmentDecision` as runtime-owned;
- fail closed before provider execution when parent W5/W5-F state is missing,
  not runtime-owned, structurally invalid, or lineage-ineligible;
- add focused tests that prove fail-closed behavior and runtime-owned marking
  without making a real provider call.

Forbidden behavior:

- no product orchestrator wiring;
- no W7-B product owner or W7-B call;
- no chain artifact, route, sink, or public/default-admin projection;
- no live job or canary;
- no prompt text, schema, model policy, cache policy, UCM, or gateway approval
  edits;
- no parser execution;
- no EvidenceItem generation changes;
- no report/verdict/warning/confidence behavior;
- no public API/UI/report/export/compatibility behavior;
- no cache read/write, Source Reliability, or storage behavior;
- no provider expansion, retries, W2/W3 widening, ACS/direct URL support, V1
  work, V1 cleanup, or cutover.

## 4. Product Runtime Owner Contract

The W6-C2 owner should mirror the existing W5 owner shape, not invent a second
provider-call architecture.

Expected owner:

```ts
runSufficiencyAssessmentDecision({
  context,
  sufficiencyIntake,
  boundedEvidenceExtraction,
})
```

Expected safeguards:

- assert `context.queryPlanningRuntimeActivation.status` is the existing hidden
  direct-text activation profile;
- assert provider id remains `anthropic`;
- assert request model policy equals the frozen run-context
  `evidence_sufficiency` task model policy;
- use `generateText` with `maxRetries: 0`;
- sanitize provider errors into a W6-C owner error without raw provider text;
- mark the returned decision with W6-C2 runtime-owned provenance.

## 5. V2 Scorecard Impact

Scorecard dimension: report-quality pipeline execution readiness.

Direct report value: limited. W6-C2 does not create public report output.

Why it is still justified: W6-C is a required upstream LLM-owned sufficiency
judgment before W7-B can form internal boundary/verdict candidates on the
product route. Without W6-C2, W7-B product execution would require a synthetic
or test-only sufficiency parent.

## 6. V2 Retirement Ledger Impact

Rows touched:

- W6-C local/core sufficiency runtime remains the semantic owner.
- W6-C2 becomes the product runtime ownership adapter for W6-C.
- W7-B product integration remains blocked until W6-C2 exists.

Retirement pressure:

- Do not add a separate W6-C artifact route or long-lived hidden mechanism in
  this slice.
- The later chain integration package should consume the W6-C2 owner directly
  and avoid adding a parallel sufficiency product path.

## 7. V2 Consolidation Gate

Latest `npm run debt:sensors`: `advisory_warn` on 2026-05-20 with known V2
source/test footprint, boundary guard size, docs volume, net-mechanism, and
consolidation-marker warnings.

Net mechanism increase: yes, one product runtime owner and one provenance marker.

Missing-capability rationale: the W6-C core runtime cannot be exercised from the
product route without a product-owned provider adapter. Existing W5 owner
pattern is the lower-complexity path; bundling W6-C2 with W7-B2 and chain
integration was rejected by Steer-Co as too broad.

Removal/merge trigger: once the product route chain is stable, W6-C2 remains the
single product ownership adapter for W6-C. Any later chain artifact must consume
W6-C2 rather than clone provider-call logic.

## 8. Verifier Plan

Required implementation verifiers:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-sufficiency-assessment-owner.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run debt:sensors
npm -w apps/web run build
git diff --check
git status --short --untracked-files=all
```

No expensive LLM tests and no live jobs are authorized.

## 9. Pass Criteria

- W6-C2 owner fails closed before provider execution for non-runtime-owned or
  structurally invalid parent state.
- W6-C2 owner marks all returned W6-C decisions as runtime-owned.
- W6-C2 owner uses no public route, artifact route, sink, product orchestrator
  call, cache read/write, Source Reliability, storage, parser, report/verdict/
  warning/confidence behavior, provider expansion, or retry behavior.
- Boundary guard confirms product/public surfaces do not import W6-C2 directly
  except where a later reviewed chain package explicitly allows it.
- Existing W6-C core tests still pass.

## 10. Stop / Escalation Triggers

Stop and reconvene Steer-Co if:

- implementing W6-C2 requires prompt/model/config/schema/UCM/gateway changes;
- implementation needs product orchestrator wiring or an artifact route;
- provider-call logic cannot stay within the W5 owner pattern;
- a focused verifier fails and root cause is unclear after one debt-guard pass;
- implementation grows beyond one owner, one provenance marker, one focused test,
  and boundary guard maintenance.

Escalate to Captain only if Steer-Co cannot consent, a live job is requested
before chain integration, or a hard approval gate is hit.
