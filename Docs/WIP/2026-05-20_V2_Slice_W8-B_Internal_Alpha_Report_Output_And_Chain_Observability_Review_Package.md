# V2 Slice W8-B Internal Alpha Report Output And Chain Observability Review Package

**Status:** Steer-Co review package; no implementation until accepted
**Date:** 2026-05-20
**Author:** Captain Deputy / Steer-Co
**Proposed implementer:** Lead Developer after separate approval only
**Package type:** report-value convergence package, not a public report package
**Source state:**

- W7-B hidden/internal `BoundaryVerdictExecutionDecision` committed at `94b171b7`.
- W6-C2 product runtime owner committed at `ca0a96fa`.
- W7-B2 product runtime owner committed at `ae7b681b`.
- W7-C product chain integration committed at `1bba8d8f`.
- W7-C handoff requires the next package to add hidden chain observability or W8-B output unless Steer-Co grants an exception.

## 1. Decision

Recommended next package: implement W8-B as one hidden/internal Alpha report-result candidate plus one hidden/admin-only chain observability artifact.

This is the balanced path after W7-C:

- avoid a second sink-less integration slice;
- avoid a pure observability-only package;
- convert W7-B2 output into the first inspectable internal report-value candidate;
- preserve public V2 as blocked/precutover/report_damaged.

W8-B must be a thin assembly/projection owner over existing W7-C chain decisions. It must not add new semantic report generation, prompt/model calls, public report prose, truth/confidence formulas, warning publication, or cutover behavior.

## 2. What W8-B Unlocks

W8-B unlocks internal Alpha review of the first product-route boundary/verdict candidate chain:

```text
W5 bounded EvidenceItem extraction
  -> W5-F EvidenceItem handoff
  -> W6-B sufficiency intake
  -> W6-C2 runtime-owned sufficiency assessment
  -> W7-A contract boundary/verdict candidate
  -> W8-A internal stop candidate
  -> W7-B2 runtime-owned boundary/verdict execution
  -> W8-B internal Alpha report-result candidate
```

The unlocked review surface is internal/admin-only. Public API, UI, report, export, and compatibility projection remain closed.

## 3. What W8-B Retires Or Merges

W8-B must merge the W8-A stop-owner purpose into the new internal Alpha report-result owner when W7-B2 accepted output exists.

Required retirement/merge posture:

- W8-A remains valid as a fail-closed pre-verdict stop candidate for blocked/damaged parents.
- W8-B supersedes W8-A only for accepted W7-B2 runtime-owned boundary/verdict output.
- W8-B records a concrete `w8aMergeTrigger = "merge_w8a_stop_owner_after_w8b_fail_closed_parity_covered"` or equivalent.
- W7-A remains temporary scaffolding for this package; W8-B must not expand it. The later W7-A merge/removal trigger from W7-B remains active.

This package may add a hidden W8-B artifact route only because it replaces W7-C's process-local, uninspectable chain state with an inspectable internal report-value artifact.

## 4. Scope

Allowed implementation files after approval:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-internal-alpha-report-result-artifact-sink.ts`
- `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts/route.ts`
- `apps/web/src/lib/analyzer-v2/orchestrator.ts`
- focused tests under:
  - `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/`
  - `apps/web/test/unit/lib/analyzer-v2-runtime/`
  - `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts/`
  - `apps/web/test/unit/lib/analyzer-v2/orchestrator-w8b-product-chain.test.ts`
  - `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- status, backlog, handoff, Agent_Outputs, and generated index updates.

Allowed behavior:

- define one `InternalAlphaReportResultCandidate` contract;
- consume only the W7-C in-memory chain decisions already available in the orchestrator;
- require W7-B2 runtime-owned decision state before creating an accepted W8-B candidate;
- preserve W5/W5-F/W6-B/W6-C2/W7-A/W8-A/W7-B2 lineage hashes and counts;
- project W7-B2 internal candidate counts, cited EvidenceItem refs, result payload hash, warning-materiality counters, token/cost/timing telemetry, and report-readiness metadata;
- record one bounded process-local hidden/admin-only W8-B artifact;
- expose the artifact only through an authenticated internal no-store route;
- keep route projection source/evidence text, prompt text, provider payloads, hidden ledger ids, and internal raw state redacted.
- follow the established analyzer-v2 internal admin route pattern: shared
  `checkAdminKey` authentication, `Cache-Control: no-store`, one strict
  `ledgerId` query parameter, and a default-projection array shape consistent
  with existing evidence-lifecycle artifact routes.

Forbidden behavior:

- no new LLM call, prompt rendering, prompt text, model policy, config, schema, UCM, cache policy, or gateway edit;
- no new Anthropic SDK import, provider seam, or provider call site in the W8-B owner, sink, route, or orchestrator additions;
- no generated public report prose;
- no public truth percentage, confidence, warning, verdict, or report result;
- no public/API/UI/report/export/compatibility projection;
- no Source Reliability, source-truth weighting, sufficiency formula, fixed epistemic formula, or deterministic semantic report judgment;
- no parser execution, cache IO, durable storage, provider expansion, retries, W2/W3 widening, ACS/direct URL support, V1 work, V1 cleanup, or cutover;
- no direct W4-I import/read/call/sink access;
- no source text, EvidenceItem statements, snippets, summaries, input packet text, prompt text, rendered prompt text, provider payloads, hidden ledger ids, or internal statuses in public/default-admin/log/error surfaces.

## 5. Accepted Inputs

W8-B may accept only:

- runtime-owned W7-B2 `BoundaryVerdictExecutionDecision`;
- the same in-process W5/W5-F/W6-B/W6-C2/W7-A/W8-A parent decisions already built by W7-C;
- current `PipelineRunContext` structural metadata needed for run id, generated UTC, and ledger id.

W8-B must fail closed if:

- W7-B2 is missing;
- W7-B2 is not runtime-owned;
- W7-B2 status is not `boundary_verdict_candidates_created_internal`;
- W7-B2 has `publicCutoverStatus` other than `blocked_precutover`;
- W7-B2 default projection is not `hash_length_provenance_only`;
- W7-B2 reports any public surface write, cache read/write, parser execution, SR read/write, or storage write;
- cited EvidenceItem refs do not map to the W5/W5-F evidence item handoff projection;
- parent lineage ids/hashes do not match the W7-C same-ledger chain.

## 6. Output Contract

Recommended contract:

```text
InternalAlphaReportResultCandidate
  decisionVersion = v2.evidence-lifecycle.internal-alpha-report-result.w8b
  kind = internal_alpha_report_result_candidate
  status
    - internal_alpha_report_result_candidate_created
    - internal_alpha_report_result_blocked
    - internal_alpha_report_result_damaged
  visibility = internal_admin_only
  publicPointerExposure = forbidden
  publicCutoverStatus = blocked_precutover
  defaultProjection = admin_structured_candidate_no_source_text
  inputLineage
  reportReadiness
    publicCutoverStatus = blocked_precutover
    publicCutoverStatusOwnership = mirror_only_not_source_of_truth
    reportQualityStatus = internal_alpha_review_candidate_not_public_report
    reportCompleteness = internal_candidate_summary_only
    comparatorReviewReadiness = ready_for_internal_comparator_review
    compatibilityProjection = closed_precutover_report_damaged
  boundaryVerdictSummary
  evidenceTraceability
  warningMaterialityInputs
  providerAndCostTelemetry
  redaction
  sideEffects
  w8aMergeTrigger
    triggerName
    triggerCondition
    parityVerifierName
    status = pending | parity_covered
  approvalPointer
```

Default route projection may include internal structured candidate metadata such as:

- W8-B status and decision id hash;
- boundary candidate count;
- verdict candidate count;
- cited EvidenceItem ref count and hashed refs;
- W7-B2 result payload hash;
- W7-B2 input packet hash and byte length;
- warning-materiality counters;
- provider id, model id, token counts, duration, and attempt count from W7-B2 telemetry;
- report-readiness status: `internal_alpha_review_candidate_not_public_report`.

Default route projection must not include:

- source text;
- EvidenceItem statements;
- snippets or summaries;
- user input text;
- prompt text or rendered prompt text;
- provider payloads;
- hidden ledger ids or raw internal statuses;
- public verdict prose, public truth percentage, public confidence, or public warning messages.

## 7. Product Orchestrator Integration

W8-B may extend the W7-C product-route chain by capturing the return value from `runBoundaryVerdictExecutionDecision(...)` and passing it, with the existing parent decisions, into the W8-B builder.

The W8-B record step must stay inside the existing hidden runtime containment block. If W8-B throws, the public damaged/precutover envelope must remain unchanged and the error must not leak.

The route must read only the W8-B artifact sink by ledger id. It must not call the orchestrator, rerun analysis, fetch source content, or reach into W4-I.

## 8. V2 SCORECARD IMPACT

Primary impact:

- advances `V2-Q5` verdict quality from uninspectable process-local W7-B2 output to internal Alpha review evidence;
- advances `V2-Q7` report-result traceability by connecting boundary/verdict candidates to cited EvidenceItem refs and W7-B2 telemetry;
- preserves `V2-Q8` public cutover safety by keeping all public surfaces blocked;
- improves `V2-Q10` complexity convergence by merging W8-A stop-owner intent into the W8-B report-result owner instead of adding a separate observability-only layer.

This is still not public report quality. It is internal report-value evidence that lets the team inspect whether the W7-B product route is producing coherent candidate structure.

## 9. V2 RETIREMENT LEDGER IMPACT

Rows touched:

- W8-A temporary stop owner: merge into W8-B for accepted W7-B2 output; keep as fail-closed fallback until parity tests cover blocked/damaged parents.
- W7-C process-local hidden chain state: replace with W8-B hidden chain artifact; no second sink-less chain slice.
- Boundary guard footprint: allow only narrow W8-B route/sink/orchestrator assertions; schedule guard split later, not in this hot path.
- W7-A merge/retirement: re-raise in the next package after W8-B as the W7-C
  -> W8-B deferred convergence item, so W7-A does not remain hidden scaffolding
  by inertia.

Debt accepted:

- one hidden/admin-only W8-B artifact sink and internal route.

Removal/merge trigger:

- once W8-B has verifier-stable fail-closed coverage, evaluate whether W8-A can be deleted or reduced to a compatibility helper;
- after W8-B internal review proves useful, the next package must either improve report value or retire/merge older W7/W8 scaffolding. Another hidden-only observation package requires Steer-Co exception.

## 10. V2 CONSOLIDATION GATE

W8-B passes the consolidation gate only if it:

- carries W7-B2 output into internal report-value review;
- adds no new semantic owner, LLM call, provider seam, or prompt/config authority;
- includes the W8-A merge trigger;
- records W7-C chain output in one bounded hidden/admin-only artifact;
- keeps public V2 damaged/precutover;
- includes leak-negative route tests;
- avoids direct W4-I access;
- records latest debt-sensor status in package and closeout.

If implementation becomes only a hidden telemetry layer without report-value candidate output, reconvene Steer-Co before proceeding.

## 11. Latest Debt Sensor Status

`npm run debt:sensors` on 2026-05-20T20:05:36Z returned `advisory_warn`:

- V2 source: `156` files / `47498` lines.
- V2 tests: `136` files / `52684` lines.
- Boundary guard: `11396` lines.
- Docs/WIP markdown files: `240`.
- Handoff markdown files: `760`.
- Debt-guard blocks: `170`.
- Net mechanism increases: `18`.
- Consolidation-marker review files: `5`.

These warnings are not blockers, but they are active steering pressure. W8-B must not add an observability-only mechanism; it must produce internal report-value output and carry a W8-A merge trigger.

## 12. Proposed Verifier Set

Required package verifiers before implementation approval:

```powershell
npm run debt:sensors
git diff --check
```

Required implementation verifiers:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-internal-alpha-report-result-artifact-sink.test.ts
npm -w apps/web run test -- test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts/route.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/orchestrator-w8b-product-chain.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/
npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run debt:sensors
npm -w apps/web run build
npm run index
git diff --check
git status --short --untracked-files=all
```

No expensive tests and no live job are authorized by this review package.

## 13. Pass Criteria

- W8-B accepted candidate requires runtime-owned accepted W7-B2 output.
- W8-B accepted candidate verifies parent W5/W5-F/W6-B/W6-C2/W7-A/W8-A/W7-B2 lineage.
- Lead Developer confirms whether `BoundaryVerdictExecutionDecision` exposes
  post-execution cited EvidenceItem refs distinct from the input packet. If only
  input-side refs are available, W8-B must restrict `evidenceTraceability` to
  input-packet lineage and document that limitation. If neither field surface is
  sufficient, stop and return to Steer-Co.
- W8-B default route projection exposes structured internal candidate metadata but no source/evidence/input/prompt/provider text.
- Public V2 result remains `4.0.0-cb-precutover` / `blocked_precutover` / damaged.
- W8-B artifact is bounded, process-local, no-store, internal/admin-only, and authenticated.
- W8-B route denies unauthenticated access and sets no-store response headers.
- W8-B route rejects invalid ledger ids and missing artifacts without leaking hidden ids or internal state.
- If W8-B or W7-B2 throws, public envelope remains unchanged and no error text leaks.
- Boundary guard confirms W8-B route/sink do not create public/report/export/compatibility exposure.
- W8-B closeout records scorecard impact, retirement ledger impact, consolidation gate result, debt-sensor status, verifier results, and no-live-job status.

## 14. Canary Posture

This package proposes no live job.

A later W8-B canary is worth spending only after implementation is committed and verifier-clean, because it would verify whether the product route produces an inspectable W8-B internal candidate on a Captain-defined input.

If later authorized, one canary is enough. It must:

- consume one tranche job only after tranche ledger update;
- use an exact Captain-defined input;
- refresh runtime from the implementation commit;
- prove W2/W3/W4/W5/W6/W7/W8-B hidden chain appears on one ledger;
- prove public/default-admin/log/error leak checks stay clean;
- record candidate counts, cited EvidenceItem ref count, result hash, token/cost/timing telemetry, and public-blocked status.

## 15. Approval Boundaries

This package does not approve:

- implementation;
- live jobs or canaries;
- prompt/model/config/schema/UCM/gateway edits or approval flips;
- additional LLM calls;
- public/API/UI/report/export/compatibility exposure;
- generated public report prose;
- public verdict/truth/warning/confidence behavior;
- parser execution, cache IO, SR/storage behavior;
- provider expansion, W2/W3 widening, ACS/direct URL support;
- V1 work, V1 cleanup, V1 removal, or cutover.

## 16. Stop / Escalation Triggers

Stop and reconvene Steer-Co if:

- W8-B needs new semantic LLM execution instead of assembling W7-B2 output;
- W8-B needs prompt/model/config/schema/UCM/gateway changes;
- W8-B needs public/default-admin source/evidence/prompt/provider text exposure;
- W8-B requires direct W4-I import/read/call/sink access;
- implementation requires Source Reliability, truth/confidence/sufficiency formulas, warning publication, cache/storage, parser, provider expansion, or retries;
- route tests cannot prove authenticated no-store internal-only access;
- boundary guard growth becomes broad or unrelated;
- a live job is proposed before implementation commit, runtime refresh, and tranche ledger update;
- reviewers disagree whether the artifact route is justified by report-value output.

Escalate to Captain only if Steer-Co cannot consent, if public/cutover/prompt/model/config/security/live-job approval is required, or if the package would change product direction.

## 17. Recommended Lead Developer Packet After Approval

```text
As Lead Developer,
Skill: debt-guard

Objective:
Implement W8-B as one hidden/internal Alpha report-result candidate plus one
hidden/admin-only chain observability artifact over the existing W7-C product
chain. Use W7-B2 runtime-owned accepted output as the required parent. Keep
public V2 blocked/precutover/report_damaged.

Authority:
Captain Deputy / Steer-Co delegated package. Proceed autonomously inside scope.
Escalate back to Captain Deputy only on stop triggers.

Allowed files/actions:
- apps/web/src/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result.ts
- apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-internal-alpha-report-result-artifact-sink.ts
- apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts/route.ts
- apps/web/src/lib/analyzer-v2/orchestrator.ts
- focused W8-B tests and boundary guard updates
- status, backlog, handoff, Agent_Outputs, generated index

Forbidden:
No prompt/model/config/schema/UCM/gateway edits, no new LLM call, no public/API/UI/report/export/compatibility behavior, no public report prose, no public verdict/truth/warning/confidence, no parser/cache/SR/storage, no provider expansion/retries, no W2/W3 widening, no ACS/direct URL, no direct W4-I access, no V1 work/cleanup/cutover, no live job.

Debt-guard control:
Required path: full, because this adds a hidden artifact/route mechanism.
Complexity budget owner: Lead Developer, monitored by Captain Deputy.
Net mechanism increase allowed only because W7-C chain output is currently
process-local and uninspectable; W8-B must carry internal report-value output
and a W8-A merge trigger.

V2 convergence controls:
- V2 SCORECARD IMPACT: first inspectable internal report-value candidate from
  W7-B2 product route.
- V2 RETIREMENT LEDGER IMPACT: W8-A merge trigger; W7-C process-local debt
  replaced by one bounded W8-B artifact.
- V2 CONSOLIDATION GATE: fail if this becomes observability-only or adds a new
  semantic owner.

Validation:
Run the W8-B verifier set from the package, including focused contract/sink/route/orchestrator tests, boundary guard, validate:v2-gates, gate-register self-test, debt:sensors, build, npm run index, git diff --check, and git status.

Stop triggers:
- W8-B needs new semantic LLM execution or prompt/model/config/schema changes;
- W8-B needs public/default-admin source/evidence/prompt/provider text exposure;
- W8-B needs direct W4-I access;
- route cannot remain authenticated/no-store/internal-only;
- verifier failure root cause is unclear after one debt-guard pass;
- live job is requested before separate canary authorization.

Output:
Follow Exchange Protocol. Return implementation delta, verifier results,
debt-guard result, scorecard/retirement/consolidation result, no-live-job
confirmation, and next canary recommendation.
```
