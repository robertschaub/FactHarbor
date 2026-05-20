# V2 Slice W7-B2 Boundary/Verdict Product Runtime Owner Review Package

Date: 2026-05-20
Status: Steer-Co-consented review package; no implementation yet
Author: Captain Deputy / Steer-Co
Review basis: W7-B implementation commit `94b171b7`, W6-C2 product owner commit `ca0a96fa`, and Steer-Co split direction to implement W6-C2 first, W7-B2 second, then chain integration third.

## 1. Purpose

W7-B core boundary/verdict execution is implemented and verifier-clean, but it is still not product-route reachable. The core owner requires injected prompt/model/provider inputs. W6-C2 added the first missing product runtime owner in the split sequence, so the next balanced step is W7-B2: one bounded product-owned runtime owner for W7-B.

This package authorizes review of the W7-B2 implementation shape only. It does not authorize product orchestrator wiring, chain integration, route/sink/artifact creation, public behavior, or live jobs.

## 2. Decision

Recommended next implementation after review:

1. Add one product-owned W7-B runtime owner that wraps existing `runBoundaryVerdictExecutionRuntime(...)`.
2. Add one process-local runtime-owned provenance marker for W7-B decisions.
3. Keep W7-B2 unreachable from the product orchestrator until a later chain-integration package.

Rejected for this slice:

- combined W7-B2 plus W6-C2-to-W7-B chain integration;
- product-route canary;
- W8-B report wrapper;
- new route, sink, or public/default-admin projection;
- prompt/model/config/schema/UCM/gateway edits.

## 3. Scope

Allowed files:

- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-boundary-verdict-execution-owner.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-boundary-verdict-execution-provenance.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-boundary-verdict-execution-owner.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- status, backlog, handoff, Agent_Outputs, and generated index updates

Allowed behavior:

- wrap existing core `runBoundaryVerdictExecutionRuntime(...)`;
- validate hidden direct-text activation before provider execution;
- validate the frozen run-context `boundary_verdict_execution` task model policy;
- load/render only the existing approved `V2_BOUNDARY_VERDICT_EXECUTION` prompt section;
- call Anthropic through `generateText` with `maxRetries: 0` and the model policy's timeout/output caps;
- sanitize provider errors without raw provider output;
- mark every returned `BoundaryVerdictExecutionDecision` as runtime-owned;
- fail closed before provider execution when required parents are missing, not runtime-owned where runtime ownership exists, structurally invalid, linearly inconsistent, or side-effect-open;
- add focused tests for fail-closed behavior, successful runtime-owned marking through a mocked provider call, provider failure sanitization, and text containment.

Forbidden behavior:

- no product orchestrator wiring;
- no W6-C2 call chain or W6-C2/W7-B combined runner;
- no chain artifact, route, sink, or public/default-admin projection;
- no live job or canary;
- no prompt text, schema, model policy, cache policy, UCM, or gateway approval edits;
- no W8-B report wrapper;
- no parser execution;
- no EvidenceItem generation changes;
- no report/verdict/warning/confidence public behavior;
- no public API/UI/report/export/compatibility behavior;
- no cache read/write, Source Reliability, or storage behavior;
- no provider expansion, retries, W2/W3 widening, ACS/direct URL support, V1 work, V1 cleanup, or cutover.

## 4. Product Runtime Owner Contract

Expected owner:

```ts
runBoundaryVerdictExecutionDecision({
  context,
  boundedEvidenceExtraction,
  evidenceItemHandoff,
  sufficiencyIntake,
  sufficiencyAssessment,
  boundaryVerdictCandidate,
  internalAlphaReportStop,
})
```

Required parent handling:

- `boundedEvidenceExtraction` must be the W5 runtime-owned decision when available through `readBoundedEvidenceExtractionRuntimeOwnedDecision(...)`;
- `sufficiencyAssessment` must be the W6-C2 runtime-owned decision when available through `readSufficiencyAssessmentRuntimeOwnedDecision(...)`;
- `sufficiencyIntake` / W6-B, W7-A, and W8-A may be passed as existing core decisions, but W7-B core parent validation remains authoritative;
- the owner must not import, read, or call W4-I routes, sinks, or provenance directly.

Expected provider safeguards:

- assert hidden direct-text runtime activation using the existing activation profile constants;
- assert provider id remains `anthropic`;
- assert request model policy equals frozen run-context `boundary_verdict_execution` task model policy;
- use `generateText` with `maxRetries: 0`;
- report token usage and duration from provider telemetry when available;
- map thrown provider failures to W7-B `provider_unavailable` without raw provider text;
- do not log prompt text, provider output, EvidenceItem statements, source text, snippets, summaries, hidden ledger ids, or internal statuses.

Expected prompt/config snapshot:

- prompt file: `apps/web/prompts/claimboundary-v2.prompt.md`;
- prompt section: `V2_BOUNDARY_VERDICT_EXECUTION`;
- config snapshot hash should include source package, provider factory version, activation snapshot, gateway task, task model policy, model policy snapshot hash, and parent decision hashes;
- no prompt text edits are authorized.

## 5. V2 Scorecard Impact

Scorecard dimension: first internal report-value execution reachability.

Direct report value: moderate but still internal-only. W7-B2 does not produce a public report or final verdict, but it makes the LLM-owned BoundarySet/VerdictSet candidate owner executable from a product-owned adapter in a later chain package.

Quality priority: W7-B2 must preserve W7-B's LLM-owned semantic boundary/verdict task and avoid deterministic semantic post-processing. It should improve reachability without changing the W7-B reasoning contract.

## 6. V2 Retirement Ledger Impact

Rows touched:

- W7-B core remains the semantic boundary/verdict execution owner.
- W7-B2 becomes the product runtime ownership adapter for W7-B.
- W7-A remains temporary contract-only scaffolding and its merge trigger remains active after W7-B2 plus chain verification.

Retirement pressure:

- Do not add a separate W7-B artifact route or long-lived hidden mechanism in this slice.
- The later chain-integration package must consume W6-C2 and W7-B2 directly instead of cloning provider-call logic.
- W7-A should not be extended as a parallel boundary/verdict path.

## 7. V2 Consolidation Gate

Latest `npm run debt:sensors`: `advisory_warn` on 2026-05-20 with known V2 source/test footprint, boundary guard size, docs volume, net-mechanism, and consolidation-marker warnings.

Net mechanism increase: yes, one product runtime owner and one provenance marker.

Missing-capability rationale: W7-B core cannot be exercised from the product route without a product-owned provider adapter. W6-C2 proves the split pattern. Combining W7-B2 with chain integration would increase blast radius and obscure whether the W7-B owner itself is sound.

Removal/merge trigger: once product-route chain integration is stable, W7-B2 remains the single product ownership adapter for W7-B. Any later chain artifact must consume W7-B2 rather than duplicate provider-call or prompt-rendering logic.

## 8. Verifier Plan

Required implementation verifiers:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-boundary-verdict-execution-owner.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution.test.ts
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

- W7-B2 owner fails closed before provider execution when W5 or W6-C runtime-owned parents are missing or invalid.
- Focused tests cover fail-closed behavior for each required parent family, not only one aggregated missing-parent case.
- W7-B2 owner marks all returned W7-B decisions as runtime-owned.
- W7-B2 owner uses the existing W7-B core runtime and does not duplicate W7-B parent validation, schema validation, citation checks, or cache policy logic.
- W7-B2 owner does not expose EvidenceItem statements, source text, prompt text, provider output, snippets, summaries, hidden ledger ids, or internal statuses in public/default-admin/log/error surfaces.
- W7-B2 owner uses no public route, artifact route, sink, product orchestrator call, cache read/write, Source Reliability, storage, parser, report/public verdict/warning/confidence behavior, provider expansion, or retry behavior.
- Boundary guard confirms product/public surfaces do not import W7-B2 directly except where a later reviewed chain package explicitly allows it.
- Existing W7-B core tests still pass.

## 10. Stop / Escalation Triggers

Stop and reconvene Steer-Co if:

- implementing W7-B2 requires prompt/model/config/schema/UCM/gateway changes;
- implementation needs product orchestrator wiring, chain integration, an artifact route, or sink;
- provider-call logic cannot stay within the W6-C2/W5 owner pattern;
- W7-B core does not expose enough contract surface for an owner without editing core W7-B outside the approved envelope;
- a focused verifier fails and root cause is unclear after one debt-guard pass;
- implementation grows beyond one owner, one provenance marker, one focused test, and boundary guard maintenance;
- text containment would require weakening W7-B input packet or default projection rules.

Escalate to Captain only if Steer-Co cannot consent, a live job is requested before chain integration, or a hard approval gate is hit.
