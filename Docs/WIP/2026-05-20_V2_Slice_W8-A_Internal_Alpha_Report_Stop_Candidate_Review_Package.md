# V2 Slice W8-A Internal Alpha Report Stop Candidate Review Package

**Status:** review package only; no implementation authorized
**Date:** 2026-05-20
**Owner:** Captain Deputy
**Proposed implementer:** Lead Developer after review approval only
**Required reviewers:** Lead Architect, Product Trust, LLM Expert, Complexity/Retirement reviewer
**Canary runner:** none; live-job ledger currently has `currentRemaining = 0`
**Source direction:** `Docs/WIP/2026-05-20_V2_Stop_Line_Executable_Plan.md` section W8-A plus W7-A implementation commit `00bd1674`

## 1. Decision Requested

Approve, reject, or amend a narrow W8-A implementation package for one
canonical internal Alpha report stop candidate owner.

Because W7-A is intentionally contract-only and does not produce semantic
boundary candidates or a verdict candidate, W8-A must also be non-verdict-bearing
unless a separate LLM boundary/verdict phase is approved first. The recommended
W8-A implementation is therefore an internal Alpha stop/result owner that
consolidates upstream readiness, sufficiency, boundary/verdict candidate absence,
warning materiality inputs, and public-cutover denial into one canonical
internal object.

This package is intentionally narrower than the full W8-A acceptance criteria in
`Docs/WIP/2026-05-20_V2_Stop_Line_Executable_Plan.md`. The executable plan's
criteria for narrative EvidenceItem citation, empirical baseline versus
normative/evaluative contestation, and report-review-ready narrative fields
presume a verdict/narrative owner. Those criteria are deferred to a later
post-W7-B package, not abandoned. This W8-A slice must not be treated as
satisfying full Alpha report completeness.

This package does not authorize implementation, live jobs, public projection,
prompt/model/config/schema/UCM/gateway edits, LLM boundary/verdict/report
execution, report text generation, verdict/truth/confidence generation, warning
publication, compatibility projection, exports, UI/API behavior, V1 work, or V1
cleanup.

## 2. Why W8-A Now

W7-A now provides a contract-only boundary/verdict candidate owner. Without W8-A,
the V2 pipeline still has no canonical internal result owner that states why the
current path is not report-ready and what downstream report-review/cutover gates
remain closed.

W8-A should prevent later adapters from inventing report semantics. It should
make the current stop condition explicit: V2 has traceable internal evidence and
sufficiency inputs, but no approved boundary/verdict LLM task and therefore no
verdict-bearing report.

## 3. Gate Summary

What this gate unlocks:

- one canonical internal report stop candidate owner for Alpha review;
- explicit non-report-ready status when boundary/verdict candidate population is
  closed;
- a single place to carry upstream sufficiency caveats and W7-A stop state into
  later report-review;
- a stable precondition for deciding whether the next phase is W7-B
  LLM-owned boundary/verdict execution or W9-A report-review/cutover planning.

What older guard/artifact it retires or merges:

- no immediate runtime deletion;
- increases `V2-RL-012` pressure because W8-A must verify downstream lineage
  without direct W4-I dependence;
- creates a stop owner that can later merge scattered hidden readiness summaries
  into a report-result contract instead of adding more proof routes.

Stop condition:

- stop before implementation if W8-A needs public projection, generated report
  prose, verdict/truth/confidence values, user-visible warnings, LLM execution,
  prompt/model/config/schema/UCM/gateway edits, or deterministic semantic
  boundary/verdict/report logic.

## 4. Accepted Inputs

W8-A may accept only allowlisted projections from:

- accepted Claim Understanding handoff references already carried downstream;
- W5-F `EvidenceItemHandoffDecision`;
- W6-B `SufficiencyIntakeDecision`;
- W6-C `SufficiencyAssessmentDecision`;
- W7-A `BoundaryVerdictCandidateDecision`;
- run context policy snapshot hashes and task/gateway identifiers when needed
  for lineage, not for semantic interpretation.

W8-A must not read/import/call W4-I runtime/sink/provenance state directly.

W8-A must not spread, clone, embed, serialize, or return parent W5/W6/W7 objects.
It must construct a new output from allowlisted fields only.

## 5. Proposed Internal Contract Shape

The future implementation package should decide exact TypeScript names, but the
contract should include these conceptual groups:

```text
InternalAlphaReportStopCandidate
  decisionVersion
  status
    - alpha_report_stop_created_not_report_ready
    - alpha_report_stop_blocked
    - alpha_report_stop_damaged
  reportReadiness
    - publicCutoverStatus = blocked_precutover
      (mirror only; not a second source of truth)
    - reportQualityStatus = alpha_candidate_not_report_ready
    - reportCompleteness = non_verdict_stop_only
    - comparatorReviewReadiness = not_ready_no_verdict_candidate
  inputLineage
    - evidenceItemHandoffRef/hash
    - sufficiencyIntakeRef/hash
    - sufficiencyAssessmentRef/hash
    - boundaryVerdictCandidateRef/hash
  evidenceTraceability
    - evidenceItemCount
    - evidenceItemRefs/hash-only
    - boundaryCandidateCount
    - verdictCandidatePresent
  sufficiencyAndStopState
    - sufficiencyResultStatus
    - recommendedNextAction
    - boundaryVerdictCandidatePopulation
    - reportStopReason
  warningMaterialityInputs
    - upstream canonical event/status refs only
    - visibility remains internal/admin-only
    - no user-visible warning publication
  publicProjection
    - always closed in W8-A
```

W8-A must not synthesize a truth percentage, confidence value, verdict label,
source-reliability adjustment, source-independence score, or normative fairness
judgment. If those become necessary, the next package must be a separately
approved LLM-owned boundary/verdict/report phase.

## 6. Report-Readiness Rules

W8-A may create an internal Alpha stop/result candidate only when:

- W5-F handoff is ready;
- W6-B intake is ready;
- W6-C sufficiency assessment is completed;
- W7-A candidate decision is ready or explicitly stopped for approved upstream
  reasons;
- W7-A has no boundary/verdict semantic candidates because LLM boundary/verdict
  execution is still closed.

W8-A must block or damage when parent contracts are missing, blocked, damaged,
lineage-mismatched, or have open forbidden side effects.

W8-A must mark the stop candidate as not public-report-ready whenever
`boundaryCandidates` is empty or `verdictCandidate` is `null`. This is a
structural readiness rule, not a semantic verdict.

## 7. Prompt / Model / Schema Boundary

W8-A should be contract-only if it only consolidates upstream contract state.

W8-A requires explicit Captain approval before implementation if it adds:

- an LLM call;
- generated report prose;
- a prompt section;
- output schema changes for model output;
- model-policy approval;
- cache policy;
- gateway executable status;
- UCM default or config behavior;
- public compatibility or API projection.

## 8. Text And Leak Boundary

Default internal/admin projections must remain hash/length/provenance-only.

W8-A must not expose source text, EvidenceItem statements, snippets, summaries,
prompt text, provider payloads, hidden ledger ids, internal statuses, or future
report prose in:

- public JSON;
- UI;
- reports;
- exports;
- compatibility projections;
- default-admin routes;
- logs;
- errors.

If a later W8 package needs report prose or EvidenceItem statements, that must
be explicitly reviewed as a separate LLM/report packet boundary.

## 9. V2 SCORECARD IMPACT

Quality dimension advanced:

- `V2-Q5` Verdict quality: protected, not advanced. W8-A prevents a
  verdict-bearing public/report result until boundary/verdict semantics are
  LLM-owned and cite EvidenceItems.
- `V2-Q6` Warning integrity: creates a canonical internal place for warning
  materiality inputs without publishing diagnostics as user warnings.
- `V2-Q8` Public cutover safety: keeps public V2 blocked/precutover and makes
  Alpha non-readiness explicit.
- `V2-Q10` Complexity convergence: potentially advanced only if implementation
  becomes the canonical stop owner and avoids adding another independent hidden
  proof lane.

Direct user/report value:

- no public report value yet; internal convergence toward report stop ownership
  and report-review gating.

Hidden-only value:

- acceptable only if W8-A becomes the canonical internal stop owner and does not
  add a new route/proof lane.

Cost/latency impact:

- no live jobs, provider calls, or LLM calls authorized by this review package.

Retirement or simplification unlocked:

- after W8-A verifies lineage without direct W4-I dependence, W4-I core/sink
  state can be considered for quarantine/removal under `V2-RL-012`.
- W8-A should reduce future need for separate readiness summaries by owning the
  internal stop state.

Scorecard risk:

- if W8-A produces report prose, verdict labels, truth/confidence values, or
  warning publication without approved LLM/report governance, it would create
  false report-readiness and harm cutover safety.

## 10. V2 RETIREMENT LEDGER IMPACT

Rows touched:

- `V2-RL-004`: no new hidden route should be added.
- `V2-RL-012`: W4-I core/sink remains temporary lineage debt; W8-A should add no
  W4-I consumer and should strengthen the removal trigger.
- `V2-RL-013`: boundary guard pressure remains; add only focused W8-A assertions
  if implementation follows.
- `V2-RL-014`: docs volume should not expand beyond this package plus one
  closeout handoff.

Status changes:

- none in this review package.

New mechanism owner:

- proposed future owner: Lead Developer under Captain Deputy / Product Trust
  review.

Removal / merge trigger:

- W8-A implementation must either prepare W4-I core/sink quarantine by proving
  canonical downstream lineage without W4-I, or stop if direct W4-I access
  appears necessary.

Debt accepted:

- review-package docs only. Any implementation debt must be explicitly stated in
  a later implementation package.

## 11. V2 CONSOLIDATION GATE

W8-A is hidden/internal. It passes the consolidation gate only if the later
implementation package:

- creates one canonical internal stop owner;
- adds no product/admin route;
- adds no W4-I consumer;
- uses allowlisted field construction instead of parent-object cloning;
- avoids report prose, verdict values, confidence, and warning publication;
- carries explicit W4-I retirement/merge pressure;
- avoids deterministic semantic analysis.

If W8-A becomes another readiness/denial/diagnostic layer without becoming the
canonical internal stop owner, Steer-Co must reconvene.

Observable consolidation condition:

- the implementation package must list which pre-W8-A hidden readiness summaries
  it supersedes, merges, or leaves with a dated removal trigger;
- if no hidden summary count decreases and no removal/merge trigger is improved,
  the implementation needs an explicit Steer-Co exception before merge.

## 12. Latest Debt Sensor Status

`npm run debt:sensors` on 2026-05-20 returned `advisory_warn`:

- V2 source: `150` files / `44162` lines.
- V2 tests: `131` files / `48827` lines.
- Boundary guard: `10573` lines.
- Docs/WIP markdown files: `235`.
- Handoff markdown files: `751`.
- Net mechanism increases: `14`.
- V2 consolidation-marker review files: `5`.

These warnings are steering context, not a blocker. W8-A must avoid broad guard
growth and hidden mechanism sprawl.

## 13. Proposed Verifier Set For Future Implementation

Minimum local verifiers for an approved W8-A implementation package:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-candidate.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run debt:sensors
npm -w apps/web run build
git diff --check
git status --short --untracked-files=all
```

If W8-A adds a new module, add focused tests for:

- accepted W7-A creates an internal Alpha non-report-ready stop candidate;
- missing/blocked/damaged W5/W6/W7 parents block or damage;
- no parent object spread/clone/embed/serialization;
- no direct W4-I import/read/call/sink access;
- no W4-I namespace reference in the W8-A module or tests except a documented
  boundary-guard forbidden-reference assertion;
- no report prose, verdict label, truth percentage, confidence value, or
  user-visible warning is generated;
- default projection remains hash/length/provenance-only;
- public shell remains blocked/precutover/report_damaged;
- Alpha candidate is ineligible for compatibility projection.

Boundary guard growth rule: implementation should prefer focused W8-A tests. Add
new `boundary-guard.test.ts` assertions only for cross-boundary import/leakage
rules that cannot be covered locally.

## 14. Approval Boundaries

This package does not approve:

- implementation;
- live jobs or canaries;
- prompt/model/config/schema/UCM/gateway edits or approval flips;
- LLM boundary clustering, verdict debate, report generation, or validation
  calls;
- generated report prose;
- public/API/UI/report/export/compatibility behavior;
- truth percentage, confidence, warning publication, verdict, or public report
  behavior;
- parser/cache/SR/storage behavior;
- provider expansion, W2/W3 widening, ACS/direct URL support;
- V1 work, V1 reuse, V1 cleanup, or V1 removal.

## 15. Stop / Escalation Triggers

Stop and reconvene Steer-Co or ask Captain if:

- prompt/model/config/schema/UCM/gateway approval is needed;
- implementation would make semantic boundary/verdict/report decisions
  deterministically;
- implementation needs EvidenceItem statements outside an approved LLM/report
  input packet;
- W8-A needs direct W4-I runtime/sink/provenance access;
- W8-A appears to need indirect W4-I access through compatibility glue or parent
  object reuse;
- public/default-admin/log/error leak is possible;
- a live job is proposed while the ledger remains `currentRemaining = 0`;
- reviewers disagree on whether W8-A should be non-verdict stop-only or wait for
  a W7-B LLM boundary/verdict package;
- W8-A cannot become the canonical internal result owner and instead becomes
  another hidden proof layer.

## 16. Recommended Review Outcome

Captain Deputy recommends **approve with strict contract-only scope**:

1. Approve W8-A as a non-verdict-bearing internal Alpha stop owner.
2. Require the implementation to mark the stop candidate
   `alpha_candidate_not_report_ready` and use stop-oriented status names.
3. Keep public V2 blocked/precutover/report_damaged.
4. Do not spend live-job budget or request a tranche reset for W8-A.
5. After W8-A, reconvene for the next real report-value phase decision:
   W7-B LLM boundary/verdict execution versus W9-A report-review of the internal
   stop candidate.
