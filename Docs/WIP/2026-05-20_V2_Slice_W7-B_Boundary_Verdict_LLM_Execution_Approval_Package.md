# V2 Slice W7-B Boundary/Verdict LLM Execution Approval Package

**Status:** review/approval package only; no implementation until accepted
**Date:** 2026-05-20
**Owner:** Captain Deputy / Steer-Co
**Proposed implementer:** Lead Developer after package approval
**Review quorum:** Lead Architect, LLM Expert, Product Trust, Code Reviewer
**Source direction:** W8-A implementation commit `63f1042a`; W7-B/W8-B package
amendment commit `b477f2bf`

## 1. Decision Requested

Approve, reject, or amend W7-B as the first LLM-owned V2
BoundarySet/VerdictSet candidate execution slice.

This package asks approval to prepare one internal-only semantic LLM execution
path after W5-F, W6-B, W6-C, W7-A, and W8-A. It does not approve public report
behavior, generated report prose, UI/API/export/compat projection, live jobs,
V1 cleanup, Source Reliability formulas, fixed truth/confidence formulas,
parser execution, provider/source widening, cache/SR/storage behavior, ACS, or
direct URL work.

W8-B is not included by default. It remains a follow-up package unless Steer-Co
confirms that it is only a thin, non-semantic internal wrapper over W7-B output.

## 2. Ground Truth

Current W7-A and W8-A are hash/length/provenance-only stop and contract owners.
They are useful for lineage and closure, but they do not carry enough text for a
boundary/verdict LLM task.

W6-C already established the acceptable pattern: consume a downstream intake
decision plus the runtime-owned W5 bounded extraction decision, construct a
bounded statement-bearing input packet internally, and keep default/admin
projections text-free.

W7-B must follow that pattern. If W7-B cannot construct the required LLM input
from approved W5/W5-F lineage without direct W4-I access or redaction weakening,
stop and reconvene Steer-Co.

## 3. Approved Input Lineage

W7-B may accept only these parents:

- W5 `BoundedEvidenceExtractionDecision` with status
  `hidden_evidence_item_extraction_completed`;
- W5-F `EvidenceItemHandoffDecision` with status
  `evidence_items_ready_for_downstream_internal_handoff`;
- W6-B `SufficiencyIntakeDecision` with ready status;
- W6-C `SufficiencyAssessmentDecision` with status
  `sufficiency_assessment_completed`;
- W7-A `BoundaryVerdictCandidateDecision` with status
  `boundary_verdict_candidate_ready`;
- W8-A `InternalAlphaReportStopCandidate` as same-lineage closure evidence
  only, not as an input text source;
- `PipelineRunContext` policy/config/model/prompt snapshot.

W7-B must fail closed on:

- missing parent;
- parent blocked/damaged;
- parent side effects not closed;
- W5/W5-F statement hash, byte length, count, provider, model, or lineage drift;
- W6-C recommendation `refine_retrieval` or `damage_report`;
- W7-A not ready;
- W8-A damaged or not linked to the same W5-F/W6-B/W6-C/W7-A lineage;
- direct W4-I import/read/call/sink access;
- any default-admin/public/log/error text exposure.

## 4. Statement-Bearing Input Packet

W7-B may build one internal-only packet:

```text
BoundaryVerdictExecutionInputPacket
  packetVersion = v2.evidence-lifecycle.boundary-verdict-input.w7b
  packetId
  parentW5DecisionId
  parentW5FDecisionId
  parentW6BDecisionId
  parentW6CDecisionId
  parentW7ADecisionId
  parentW8ADecisionId
  evidenceItemCount
  evidenceItems[]
    evidenceItemId
    statement
    statementHash
    statementByteLength
    targetAtomicClaimIds
    claimDirection
    probativeValue
    evidenceStrength
    extractionConfidence
    evidenceScopeHash
    provenanceHash
  sufficiencyAssessmentProjection
  warningMaterialitySeed
  sourceMaterialLineageHash
  sourceProviderId
  parentEvidenceExtractionModelId
```

Packet rules:

- EvidenceItem statements may appear inside this provider input packet only.
- Default admin projection returns only packet hash, byte length, item count,
  parent ids, parent versions, provider/model ids, and lineage hashes.
- Public JSON, UI, reports, exports, compatibility projections, logs, errors,
  and default admin routes must never expose the statements, source text,
  snippets, summaries, prompt text, provider payloads, hidden ledger ids, or
  internal statuses.
- Input packet cap: maximum 50 EvidenceItems and maximum 100,000 serialized
  UTF-8 bytes. The cap is intentionally sized to admit the lower and mid-range
  Captain benchmark families while still bounding context and leak surface. If
  exceeded, fail closed with `boundary_verdict_input_too_large` until a later
  LLM-owned compression/selection package is approved. Do not add deterministic
  semantic selection logic.
- W5/W5-F statement hash and byte-length parity must be checked before packet
  construction and after packet construction.

## 5. LLM Task Contract

The preferred W7-B task is one combined LLM call. Splitting boundary formation
and verdict generation into two calls is rejected for this slice unless review
finds the combined task materially harms quality.

Proposed task:

```text
taskKey: boundary_verdict_execution
gatewayTaskId: boundary_verdict_execution
promptSectionId: V2_BOUNDARY_VERDICT_EXECUTION
outputSchemaVersion: v2.boundary_verdict_execution.0
modelTask: verdict
cache: no-store/no-read
maxCalls: 2 total attempts, including one schema retry
timeout: 90 seconds
outputTokens: 4000 maximum
```

Gateway identity decision:

- W7-B uses a new combined gateway task id:
  `boundary_verdict_execution`.
- It does not reuse the existing `boundary_clustering` or `verdict_debate`
  task ids because this slice intentionally tests one combined
  boundary-before-verdict execution contract.
- The implementation must update gateway task typing, gateway policy, model
  policy, cache policy, and surface ledger ownership consistently.
- If implementation discovers that the existing split task ids are required for
  correctness, stop and reconvene Steer-Co instead of silently changing the task
  identity.

The output schema must be strict and must distinguish internal candidate labels
from any future final public labels.

```text
BoundaryVerdictExecutionResult
  status = accepted | blocked | damaged
  boundarySetCandidate
    boundaries[]
      boundaryCandidateId
      title
      targetAtomicClaimIds
      evidenceItemIds
      evidenceScopeSummary
      rationale
  verdictSetCandidate
    verdictCandidates[]
      verdictCandidateId
      boundaryCandidateIds
      targetAtomicClaimIds
      evidenceItemIds
      internalVerdictLabelCandidate
      internalTruthPercentageCandidate
      internalConfidenceCandidate
      rationale
      caveats
      materialUncertaintySignals
  warningMaterialityInputs
  integrityEvents
```

Internal truth and confidence candidates are allowed only as LLM-owned review
candidates. They are not final public truth, final public confidence, published
warning severity, or cutover behavior. Fixed deterministic truth/confidence or
sufficiency formulas are forbidden.

`internalVerdictLabelCandidate` must be one of `TRUE`, `MOSTLY-TRUE`,
`LEANING-TRUE`, `MIXED`, `LEANING-FALSE`, `MOSTLY-FALSE`, `FALSE`, or
`UNVERIFIED`. Any other value is a schema validation failure.

Every boundary candidate must cite at least one `evidenceItemId`. A boundary
candidate with zero cited evidence items is a schema validation failure.

Combined-call quality trigger:

- After the first successful W7-B candidate execution on a benchmark-family
  input, compare the boundary groupings against the best available comparator
  structure for that family.
- If W7-B shows verdict-fitting behavior, such as one mega-boundary containing
  all items or boundary splits that mirror verdict direction rather than
  evidence-scope grouping, reconvene Steer-Co before accepting the prompt as
  stable.
- If the combined call is adequate, record the comparison as positive evidence
  in the W7-B closeout or canary result.

## 6. W7-B Decision Owner

Implementation should produce:

```text
BoundaryVerdictExecutionDecision
  decisionVersion = v2.evidence-lifecycle.boundary-verdict-execution.w7b
  status
    - boundary_verdict_candidates_created_internal
    - boundary_verdict_execution_blocked
    - boundary_verdict_execution_damaged
  blockedReason
  damagedReason
  visibility = internal_admin_only
  publicCutoverStatus = blocked_precutover
  defaultProjection = hash_length_provenance_only
  inputPacketHash
  inputPacketByteLength
  boundaryCandidateCount
  verdictCandidateCount
  citedEvidenceItemRefs
  warningMaterialityInputs
  executionTelemetry
  redaction
  sideEffects
  approvalPointer
```

Side effects must make the new semantic work explicit:

- `boundaryVerdictLlmCalled` may be true only when the task reaches the approved
  provider boundary.
- `promptLoaded`, `promptRendered`, `modelCalled`, and
  `cacheDecisionConstructed` may reflect actual execution.
- `cacheRead`, `cacheWrite`, `parserExecuted`, `sourceReliabilityRead`,
  `sourceReliabilityWrite`, `storageWrite`, `reportGenerated`,
  `publicSurfaceWritten`, and compatibility writes must remain false.

## 7. Prompt / Model / Schema / Gateway Approval

<a id="captain-approved-w7-b"></a>

This package requests review approval for the Lead Developer to implement these
governed files after approval:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/task-contracts/types.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/task-contracts/schemas.ts`
- `apps/web/src/lib/analyzer-v2/gateway/approval-records.ts`
- `apps/web/src/lib/analyzer-v2/gateway/cache-policy-registry.ts`
- `apps/web/src/lib/analyzer-v2/gateway/model-policy-registry.ts`
- `apps/web/src/lib/analyzer-v2/gateway/policy.ts`
- `apps/web/src/lib/analyzer-v2/gateway/surface-ledger.ts`
- `apps/web/src/lib/analyzer-v2/gateway/types.ts`
- `Docs/AGENTS/V2_Gate_Register.json` for audit-only W7-B gate registration;
- `scripts/validate-v2-gate-register.mjs` for validator awareness of the
  W7-B approval token and cache-policy selector;
- `apps/web/prompts/claimboundary-v2.prompt.md` only for the approved
  `V2_BOUNDARY_VERDICT_EXECUTION` section;
- focused tests and boundary guard updates;
- status, backlog, handoff, Agent_Outputs, and generated index updates.

The prompt must be generic, multilingual, topic-neutral, and must not contain
Captain benchmark terms, example-specific wording, deterministic semantic
rules, or report-specific hacks.

The `V2_BOUNDARY_VERDICT_EXECUTION` prompt section must receive one focused
Steer-Co review before the Lead Developer commits implementation. That review
covers generic/multilingual compliance, no benchmark terms, citation instruction
clarity, and boundary-before-verdict reasoning order if the combined call is
retained.

The implementation must include focused prompt contract tests that prove:

- the `V2_BOUNDARY_VERDICT_EXECUTION` section exists;
- the expected output schema/version is referenced;
- required variables are present and renderable;
- the section avoids Captain benchmark terms and report-specific examples;
- render succeeds with bounded structural fixtures.

Cache posture is no-store/no-read for W7-B. Any cache read/write proposal is out
of scope and requires separate approval.

Approval authority: Captain-delegated Steer-Co consent under the current
Captain Deputy operating model, after Claude Opus, Product Trust, and Code
Reviewer review amendments. The approval anchor is audit evidence only and does
not authorize live jobs or public behavior.

## 8. Warning Materiality Contract

W7-B must define `warningMaterialityInputs` as internal review data only:

- upstream W6-C sufficiency status and recommended action;
- boundary/verdict candidate integrity events;
- citation-mismatch or schema-damage signals;
- candidate-level material uncertainty signals from the LLM;
- no user-visible warning publication.

Warning severity remains governed by AGENTS.md: severity follows verdict impact.
W7-B may not register or publish new user-visible warnings.

## 9. Report Quality Acceptance Targets

W7-B targets internal candidate review readiness, not public report readiness.
The implementation package must use exact Captain-defined inputs only.

Concrete target references:

| Family | Expected labels | Truth band | Confidence band | Min boundaries | Comparator posture |
|---|---|---:|---:|---:|---|
| bundesrat-rechtskraftig | MIXED, LEANING-TRUE, LEANING-FALSE | 35-60 | 55-85 | 2 | exact local current `f8e72c84fb004f23945e23c81973fc26`; historical local exact `b92201bb47454f7498a1919c4a82c567` |
| bundesrat-simple | TRUE, MOSTLY-TRUE | 85-100 | 75-95 | 2 | exact local historical `a6b0e0fc14984926a678a462456bc110`; exact current `1de78d0a5a2c428baba3f40d189e46a7` |
| asylum-235000-de | LEANING-TRUE, MOSTLY-TRUE | 58-75 | 40-70 | 1 | exact local current `bb2133a191894da9bacf4f63e4b458ac`; exact deployed `6a60b3eb0df540c0b16228d9367b1366` |
| asylum-wwii-de | MOSTLY-FALSE, LEANING-FALSE | 18-42 | 50-75 | 2 | exact local current `9e1f0f0014564edeaa0e673b43dc27e6`; exact deployed `a48a621091da41f59bf1cb64676f6b76` |
| bolsonaro-en | LEANING-TRUE, MOSTLY-TRUE | 58-85 | 45-75 | 3 | exact local historical `91bf6083d26e407c98a474d89d2e618f`; exact deployed `85812d61a3984fa6bb945d4096eaa039` |
| bolsonaro-pt | LEANING-TRUE, MOSTLY-TRUE | 58-85 | 45-75 | 3 | exact local `e182f37a471443bfbb2d5b8bf9a763d3`; exact deployed `3469b32536004b369501b4cdd11e7dd5` |
| hydrogen-en | FALSE, MOSTLY-FALSE | 5-25 | 65-85 | 2 | exact local historical `24654634057b4b3e965b3239ef5fe8e4`; exact current `1f838f8b81804aa6997601507a46da07` |
| plastic-en | FALSE, MOSTLY-FALSE, LEANING-FALSE, MIXED | 10-42 | 55-80 | 2 | exact local historical `32f00bb32d644a909f0c99521e800536`; exact current `939563ecbea14a4c90249eb13c9743ef` |

The implementation package must label each comparator it uses as exact/variant,
local/deployed, and current-stack/historical. Public cutover remains closed even
if W7-B candidates look good.

## 10. Product Trust / Leak Boundary

Mandatory before W7-B is accepted as internally Alpha-ready:

- negative tests for public JSON, UI, report/export/compat projection,
  default-admin route responses, logs, and errors;
- no source text, EvidenceItem statements, snippets, summaries, prompt text,
  provider payloads, hidden ledger ids, internal statuses, final verdict labels,
  final confidence, or warning publication in those surfaces;
- default admin projection is hash/length/provenance-only.

Optional explicit admin inspection of candidate text is not part of W7-B.

## 11. V2 SCORECARD IMPACT

Quality dimension advanced:

- `V2-Q4` Boundary formation: first semantic candidate owner.
- `V2-Q5` Verdict quality: first internal verdict candidate owner.
- `V2-Q6` Warning integrity: materiality inputs defined without publication.
- `V2-Q8` Public cutover safety: public remains blocked.
- `V2-Q9` Cost/latency discipline: one combined LLM call with caps.
- `V2-Q10` Complexity convergence: W7-A merge trigger required.

Direct user/report value:

- No public user value yet, but this is the first slice that can produce
  reviewable report-value semantics.

Hidden-only value:

- Acceptable because it introduces the missing semantic execution capability,
  not another denial/proof layer.

Cost/latency impact:

- One bounded LLM call, no live job in this package. Actual cost/timing must be
  captured before any canary is judged.

Retirement or simplification unlocked:

- W7-A contract-only owner can merge into W7-B after W7-B is verifier-stable and
  equivalent fail-closed coverage exists.

Scorecard risk:

- Weak prompt/output design can produce plausible but uncited verdicts. Citation
  mismatch and comparator tests are mandatory.

## 12. V2 RETIREMENT LEDGER IMPACT

Rows touched:

- `V2-RL-012`: still no new W4-I consumer; W7-B must prove downstream lineage
  without W4-I direct access.
- `V2-RL-013`: boundary guard additions must be focused and later split.
- `V2-RL-014`: do not expand WIP narrative beyond this package and completion
  handoff.

Status changes:

- none in this review package.

New mechanism owner:

- `BoundaryVerdictExecutionDecision`, owned by Lead Developer if approved.

Removal / merge trigger:

- Merge W7-A into W7-B after W7-B is verifier-stable and W7-A fail-closed cases
  are covered by W7-B tests.

Debt accepted:

- One new semantic execution owner is proposed as missing capability, not
  hidden-only scaffolding. No implementation debt is accepted by this package.

## 13. V2 CONSOLIDATION GATE

W7-B passes the consolidation gate only if it:

- implements the semantic LLM boundary/verdict capability directly;
- avoids another readiness/proof/diagnostic owner;
- uses the W5/W5-F statement-bearing path without direct W4-I access;
- keeps default/public/admin redaction intact;
- defines W7-A merge criteria;
- adds focused tests rather than broad guard growth;
- does not bundle W8-B unless W8-B is proven thin and non-semantic.

BALANCED RISK MITIGATION

Named risk: V2 could produce internal verdict candidates without enough text,
citations, or leak controls, causing false progress or public leakage.
Decision result: add one W7-B semantic execution owner.
Rejected alternatives: add another readiness/denial layer; make W8-B first;
reuse W7-A hash-only projections; directly read W4-I; expose source text in
admin defaults.
Owner: Lead Developer.
Verifier: W7-B focused tests, boundary guard, gate validation, debt sensors,
build, and leak-negative tests.
Net-complexity impact: one new semantic owner, offset by W7-A merge trigger.
Residual risk: first prompt/schema may underperform; canary remains blocked
until commit, runtime refresh, tranche ledger, and separate authorization.
Removal / merge trigger: W7-A merges into W7-B after stable fail-closed parity.

## 14. Latest Debt Sensor Status

`npm run debt:sensors` on 2026-05-20T17:32:53Z returned `advisory_warn`:

- V2 source: `151` files / `44771` lines.
- V2 tests: `132` files / `49502` lines.
- Boundary guard: `10745` lines.
- Docs/WIP markdown files: `237`.
- Handoff markdown files: `754`.
- Files scanned: `755`.
- Debt-guard blocks: `162`.
- Net mechanism increases: `14`.
- V2 consolidation-marker review files: `5`.

These warnings are steering pressure. The proposed W7-B owner is justified only
because it is the first missing semantic execution capability and carries a
W7-A merge trigger.

## 15. Verifier Plan

Package verifier:

```powershell
npm run debt:sensors
npm run index
git diff --check
```

Implementation verifier after approval:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/
npm -w apps/web run test -- test/unit/lib/analyzer-v2/gateway/
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/
npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run debt:sensors
npm -w apps/web run build
git diff --check
git status --short --untracked-files=all
```

Focused tests required before closeout:

- accepted W5/W5-F/W6-B/W6-C/W7-A/W8-A lineage creates one internal candidate
  decision;
- W5/W5-F statement hash/count/byte mismatch fails closed;
- provider/model/prompt/cache gate missing fails closed;
- provider unavailable, parse failure, schema invalid, and citation mismatch
  produce damaged/non-public decisions;
- prompt section exists, declares the expected schema/version, includes required
  variables, avoids benchmark terms, and renders with bounded structural
  fixtures;
- output evidence ids must reference input EvidenceItems;
- every boundary candidate cites at least one input EvidenceItem;
- internal verdict labels are restricted to the approved eight-label set;
- no deterministic semantic fallback when the model returns unusable output;
- public/default-admin/log/error/export leak-negative checks.

## 16. Live-Job Posture

No live job is proposed in this package.

A later W7-B canary may be worth spending only after:

- implementation is committed;
- runtime is refreshed from the implementation commit;
- route/runtime preflight passes;
- live-job tranche ledger records starting budget, remaining budget, approval
  pointer, and per-canary consumption rule;
- Steer-Co or Captain explicitly authorizes the canary.

Recommended first canary input, if later authorized:

`Using hydrogen for cars is more efficient than using electricity`

Reason: it has a clean expected false-side band and existing exact current and
historical comparators.

## 17. Approval Boundaries

If this package is approved, Lead Developer may prepare W7-B implementation
inside the file envelope in Section 7.

Still blocked until separately approved:

- live jobs/canaries;
- W8-B implementation if it is more than a thin non-semantic wrapper;
- public/API/UI/report/export/compatibility behavior;
- generated public report prose;
- public truth percentage, confidence, warning, verdict, or cutover behavior;
- Source Reliability/truth/confidence/sufficiency formulas;
- parser/cache/SR/storage behavior;
- provider expansion, W2/W3 widening, ACS/direct URL support;
- V1 work, V1 reuse, V1 cleanup, or V1 removal.

## 18. Stop / Escalation Triggers

Stop and reconvene Steer-Co if:

- the statement-bearing packet cannot be built from approved W5/W5-F lineage;
- implementation needs direct W4-I access;
- implementation needs deterministic semantic boundary/verdict logic;
- W7-B starts selecting/dropping EvidenceItems by code semantics;
- W8-B grows beyond a thin wrapper and is still bundled into W7-B;
- schema or prompt scope expands beyond the approved section/task;
- leak-negative tests fail with unclear cause;
- verifier failure root cause is unclear after first recovery pass;
- debt sensors indicate a new hidden mechanism without W7-A merge progress.

Escalate to Captain if:

- public behavior, live budget, cutover, V1 cleanup, or security/data handling
  would change;
- Steer-Co cannot reach consent;
- prompt/model/config/schema authority becomes ambiguous.

## 19. Copy-Ready Lead Developer Prompt After Approval

```text
As Lead Developer,
Skill: debt-guard

Implement W7-B inside the approved package:
Docs/WIP/2026-05-20_V2_Slice_W7-B_Boundary_Verdict_LLM_Execution_Approval_Package.md

Objective:
Create one internal-only BoundaryVerdictExecutionDecision owner that runs one
approved LLM boundary/verdict task over a bounded statement-bearing input packet
constructed from approved W5/W5-F lineage plus W6-B/W6-C/W7-A/W8-A closure
evidence.

Scope:
- Allowed source/test/docs files are listed in package Section 7.
- Preserve default hash/length/provenance-only admin projection.
- Keep public V2 blocked/precutover/report_damaged.
- Include W7-A merge trigger and focused tests.

Forbidden:
live jobs, W8-B unless separately confirmed as thin/non-semantic, public/API/UI
/report/export/compat behavior, generated public report prose, parser execution,
cache/SR/storage behavior, provider expansion, W2/W3 widening, ACS/direct URL,
Source Reliability/truth/confidence formulas, deterministic semantic logic,
direct W4-I access, V1 work, and V1 cleanup.

Mandatory checks:
- Apply full debt-guard.
- Run the implementation verifier set from package Section 15.
- Include V2 SCORECARD IMPACT, V2 RETIREMENT LEDGER IMPACT, V2 CONSOLIDATION
  GATE, latest debt-sensor status, DEBT-GUARD RESULT, and Exchange Protocol
  closeout.

Return implementation delta, verifier results, final git status, and whether a
later W7-B canary should be requested. Do not run a live job.
```
