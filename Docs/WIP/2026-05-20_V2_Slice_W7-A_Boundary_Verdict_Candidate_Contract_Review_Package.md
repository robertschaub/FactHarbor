# V2 Slice W7-A Boundary And Verdict Candidate Contract Review Package

**Status:** review package only; no implementation authorized
**Date:** 2026-05-20
**Owner:** Captain Deputy
**Proposed implementer:** Lead Developer after review approval only
**Required reviewers:** Lead Architect, LLM Expert, Product Trust, Complexity/Retirement reviewer
**Canary runner:** none; live-job ledger currently has `currentRemaining = 0`
**Source direction:** `Docs/WIP/2026-05-20_V2_Stop_Line_Executable_Plan.md` section W7-A plus W6-C hygiene closeout at `06402d95`

## 1. Decision Requested

Approve, reject, or amend a narrow W7-A implementation package whose only
purpose is to define the first internal-only Boundary/Verdict candidate contract
after W6-C sufficiency.

This package does not authorize code changes, live jobs, public projection,
prompt edits, model-policy changes, schema changes, or gateway approval flips.

## 2. Why W7-A Now

W6-C now owns a hidden/internal `SufficiencyAssessmentDecision` over W6-B intake
and W5 EvidenceItem statements. The next report-value bridge is not another
source/readiness/proof layer. It is the contract boundary where accepted
sufficiency either:

- stops downstream report/verdict construction for insufficiency; or
- allows a future Boundary/Verdict candidate owner to cite EvidenceItem ids and
  preserve sufficiency caveats.

W7-A is therefore the next bounded phase-transition package. It should not run
verdict generation yet unless prompt/model/schema approval is explicitly granted
in a later reviewed package.

## 3. Gate Summary

What this gate unlocks:

- a reviewed internal contract shape for future `BoundarySet` and `VerdictSet`
  candidates;
- explicit stop-on-insufficiency semantics before W8-A `ReportResult`;
- evidence-id traceability requirements from verdict candidates back to W5
  EvidenceItems;
- a place to carry sufficiency caveats into W8-A without adapter-side inference.

What older guard/artifact it retires or merges:

- no immediate runtime deletion;
- `V2-RL-012` pressure increases: W7-A/W8-A must verify downstream lineage
  without direct W4-I dependence before remaining W4-I core/sink state can be
  quarantined or removed;
- W7-A must not add new W4-I consumers and must not create a new inspection
  route.

Stop condition:

- stop before implementation if W7-A requires prompt/model/config/schema/UCM
  changes, gateway approval flips, LLM verdict execution, public projection, or
  deterministic semantic boundary/verdict logic without a separately approved
  package.

## 4. Accepted Inputs

W7-A may accept only allowlisted projections from:

- accepted Claim Understanding handoff;
- W5-F `EvidenceItemHandoffDecision`;
- W6-B `SufficiencyIntakeDecision`;
- W6-C `SufficiencyAssessmentDecision`;
- run context policy snapshot hashes and task/gateway identifiers when needed
  for lineage, not for semantic interpretation.

W7-A must not read/import/call W4-I runtime/sink/provenance state directly.

W7-A must not spread, clone, embed, serialize, or return parent W5/W6 objects.
It must construct a new output from allowlisted fields only.

## 5. Proposed Internal Contract Shape

The future implementation package should decide exact TypeScript names, but the
contract should include these conceptual groups:

```text
BoundaryVerdictCandidateDecision
  decisionVersion
  status
    - boundary_verdict_candidate_ready
    - boundary_verdict_candidate_blocked
    - boundary_verdict_candidate_damaged
  inputLineage
    - claimUnderstandingRef/hash
    - evidenceItemHandoffRef/hash
    - sufficiencyIntakeRef/hash
    - sufficiencyAssessmentRef/hash
  sufficiencyGate
    - sufficiencyResultStatus
    - recommendedNextAction
    - stopReason when downstream must stop
  boundaryCandidates
    - boundaryCandidateId
    - targetAtomicClaimIds
    - evidenceItemIds
    - evidenceScopeRefs/hash-only projections
    - compatibility/caveat fields
  verdictCandidate
    - verdictCandidateId
    - boundaryCandidateIds
    - evidenceItemIds
    - support/opposition/mixed evidence references
    - inferentialFitCaveats
    - normativeOrEvaluativeCaveats
    - language/temporal/source-concentration caveats
  publicProjection
    - always closed in W7-A
```

If real verdict meaning, boundary grouping, truth direction, confidence, or
normative evaluation is needed, it must be owned by an approved LLM task and not
by deterministic code.

Contract-only mode is deliberately non-semantic. If prompt/model/schema approval
has not been granted, W7-A may populate only `status`, `inputLineage`, and
`sufficiencyGate` fields. `boundaryCandidates` must be empty and
`verdictCandidate` must be `null`, except for an explicit non-verdict stop
artifact that carries no boundary grouping, evidence assignment, verdict
direction, truth scalar, confidence, or normative/evaluative judgment. Populating
boundary grouping, evidence-to-boundary assignment, verdict direction, challenger
fields, or warrant-bridge fields requires a separately approved LLM-owned task.

## 6. Stop-On-Insufficiency Rules

W7-A must fail closed or produce a non-verdict stop decision when W6-C reports:

- blocked or damaged sufficiency assessment;
- `recommendedNextAction = refine_retrieval`;
- `recommendedNextAction = damage_report`;
- accepted sufficiency with material scarcity/source-concentration caveats that
  the approved contract marks as non-verdict-bearing.

W7-A must not decide material scarcity, source concentration, or sufficiency
severity itself. It may only follow explicit W6-C LLM-owned output fields, or a
later separately approved LLM boundary/verdict task.

W7-A must not create an unsupported scalar truth percentage. A non-verdict
insufficiency candidate may proceed only as a stop artifact for W8-A to render
internally as "Alpha not report-ready", not as a verdict-bearing report.

## 7. Prompt / Model / Schema Boundary

Current V2 has placeholder gateway tasks for `boundary_clustering`,
`verdict_debate`, and `verdict_validation`, but W7-A does not yet have a
reviewed V2 task contract equivalent to the W6-C sufficiency contract.

Therefore:

- if W7-A implementation only adds type-level contract scaffolding and
  structural stop-on-insufficiency logic, it still requires a reviewed
  implementation package but may avoid prompt/model/schema approval;
- if W7-A implementation adds an LLM call, prompt section, output schema,
  model-policy approval, cache policy, gateway executable status, or UCM
  default, it requires explicit Captain approval for that exact phase
  transition before implementation.

## 8. Text And Leak Boundary

Default internal/admin projections must remain hash/length/provenance-only.

W7-A must not expose source text, EvidenceItem statements, snippets, summaries,
prompt text, provider payloads, hidden ledger ids, or internal statuses in:

- public JSON;
- UI;
- reports;
- exports;
- compatibility projections;
- default-admin routes;
- logs;
- errors.

If an implementation package later needs EvidenceItem statements inside an LLM
input packet, that must be explicitly reviewed as an LLM-owned packet boundary
and must stay process-local/provider-boundary only.

## 9. V2 SCORECARD IMPACT

Quality dimension advanced:

- `V2-Q4` Boundary formation: defines how V2 equivalent boundary candidates
  remain evidence-traceable and do not become adapter-side interpretation.
- `V2-Q5` Verdict quality: creates the precondition for verdict candidates with
  EvidenceItem citations and sufficiency caveats.
- `V2-Q6` Warning integrity: ensures insufficiency and caveats stay materiality
  inputs for W8-A instead of hidden diagnostics.
- `V2-Q7` Multilingual robustness: requires original language preservation
  through claim, evidence, boundary, and verdict candidate contracts.
- `V2-Q8` Public cutover safety: keeps public V2 blocked/precutover.
- `V2-Q10` Complexity convergence: prevents another hidden proof lane and keeps
  W4-I retirement pressure explicit.

Direct user/report value:

- no public report value yet; direct internal report-value bridge toward W8-A.

Hidden-only value:

- acceptable only because W7-A is the direct predecessor to W8-A internal Alpha
  `ReportResult` and carries a W4-I no-new-consumer rule.

Cost/latency impact:

- no live jobs or provider calls authorized by this review package;
- any future LLM verdict/boundary call requires explicit cost/latency review.

Retirement or simplification unlocked:

- after W7-A/W8-A verify lineage without direct W4-I dependence, W4-I core/sink
  state can be quarantined or removed under `V2-RL-012`.

Scorecard risk:

- if implemented as deterministic semantic grouping or verdict scalar logic,
  W7-A would violate the LLM-intelligence rule and damage report quality.

## 10. V2 RETIREMENT LEDGER IMPACT

Rows touched:

- `V2-RL-001`: V1 cleanup remains blocked; W7-A maps future V2 replacement
  coverage for boundary/verdict surfaces only.
- `V2-RL-004`: no new hidden route should be added.
- `V2-RL-012`: W4-I core/sink remains temporary lineage debt; no new W4-I
  consumers.
- `V2-RL-013`: boundary guard pressure remains; add only focused assertions if
  implementation follows.
- `V2-RL-014`: docs volume should not expand beyond this package plus one
  closeout handoff.

Status changes:

- none in this review package.

New mechanism owner:

- proposed future owner: Lead Developer under Lead Architect / LLM Expert
  review.

Removal / merge trigger:

- W7-A implementation must either set the path for W8-A to remove W4-I
  dependency, or stop if W4-I direct access appears necessary.

Debt accepted:

- review-package docs only. Any implementation debt must be explicitly stated in
  a later implementation package.

## 11. V2 CONSOLIDATION GATE

W7-A is hidden/internal. It passes the consolidation gate only if the later
implementation package:

- directly bridges W6-C to W8-A internal Alpha `ReportResult`;
- adds no product/admin route;
- adds no W4-I consumer;
- uses allowlisted field construction instead of parent-object cloning;
- carries explicit W4-I retirement/merge pressure;
- avoids deterministic semantic analysis.

If W7-A becomes another readiness/denial/diagnostic layer without W8-A
readiness value, Steer-Co must reconvene.

## 12. Latest Debt Sensor Status

`npm run debt:sensors` on 2026-05-20 returned `advisory_warn`:

- V2 source: `149` files / `43633` lines.
- V2 tests: `130` files / `48279` lines.
- Boundary guard: `10413` lines.
- Docs/WIP markdown files: `233`.
- Handoff markdown files: `748`.
- Net mechanism increases: `14`.
- V2 consolidation-marker review files: `5`.

These warnings are steering context, not a blocker. W7-A must avoid broad guard
growth and hidden mechanism sprawl.

## 13. Proposed Verifier Set For Future Implementation

Minimum local verifiers for an approved W7-A implementation package:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run debt:sensors
npm -w apps/web run build
git diff --check
git status --short --untracked-files=all
```

If W7-A adds a new module, add focused tests for:

- no verdict candidate when sufficiency blocks;
- no parent object spread/clone/embed/serialization;
- evidence-id traceability from verdict candidate to EvidenceItems;
- original-language preservation as structural fields;
- no direct W4-I import/read/call/sink access;
- default projection remains hash/length/provenance-only;
- public shell remains blocked/precutover/report_damaged.

Boundary guard growth rule: implementation should prefer focused W7-A tests. Add
new `boundary-guard.test.ts` assertions only for cross-boundary import/leakage
rules that cannot be covered locally.

## 14. Approval Boundaries

This package does not approve:

- implementation;
- live jobs or canaries;
- prompt/model/config/schema/UCM/gateway edits or approval flips;
- LLM boundary clustering, verdict debate, or verdict validation calls;
- public/API/UI/report/export/compatibility behavior;
- truth percentage, confidence, warning, verdict, or report behavior;
- parser/cache/SR/storage behavior;
- provider expansion, W2/W3 widening, ACS/direct URL support;
- V1 work, V1 reuse, V1 cleanup, or V1 removal.

## 15. Stop / Escalation Triggers

Stop and reconvene Steer-Co or ask Captain if:

- prompt/model/config/schema/UCM/gateway approval is needed;
- a future implementation would make semantic boundary/verdict decisions
  deterministically;
- a future implementation needs EvidenceItem statements outside an approved LLM
  input packet;
- W7-A needs direct W4-I runtime/sink/provenance access;
- W7-A appears to need indirect W4-I access through compatibility glue or parent
  object reuse;
- a public/default-admin/log/error leak is possible;
- a live job is proposed while the ledger remains `currentRemaining = 0`;
- reviewers disagree on whether W7-A should be contract-only or LLM-executable;
- W7-A cannot directly prepare W8-A and instead becomes another hidden proof
  layer.

## 16. Recommended Review Outcome

Captain Deputy recommends **approve with amendment discipline**:

1. Approve W7-A as the next review direction.
2. Require Lead Architect and LLM Expert to decide whether implementation is:
   - contract-only stop/candidate scaffolding first; or
   - a separately approved prompt/model/schema phase transition.
3. Keep W8-A internal Alpha `ReportResult` as the next positive stop-line target.
4. Do not spend live-job budget, and do not request a tranche reset for W7-A.
