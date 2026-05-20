# V2 Slice W7-B / W8-B LLM Boundary-Verdict Report-Value Review Package

**Status:** review package only; no implementation authorized
**Date:** 2026-05-20
**Owner:** Captain Deputy / Steer-Co
**Proposed implementer:** Lead Developer after separate approval only
**Reviewer quorum:** Lead Architect, LLM Expert, Product Trust, Code Reviewer
**Canary runner:** none in this package
**Source direction:** W8-A closeout commit `63f1042a`; Steer-Co consent on
2026-05-20 with Claude Opus 4.6 and Gemini reviewers.

## 1. Decision Requested

Approve, reject, or amend a review-only package for the next V2 phase:
the first LLM-owned boundary/verdict/report-value path after W8-A.

The recommended next implementation package should be narrow and split into
reviewed sub-steps:

1. **W7-B:** LLM-owned BoundarySet / VerdictSet candidate execution over the
   runtime-owned W5-F/W6-B/W6-C lineage, producing internal-only boundary and
   verdict candidates.
2. **W8-B:** internal Alpha report-result assembly from those candidates,
   preserving cited EvidenceItem traceability and keeping public V2 blocked
   until report quality is reviewed.

This package does not approve implementation, live jobs, prompt/model/config
changes, schema edits, UCM/gateway approval flips, public/API/UI/report/export
behavior, V1 cleanup, or cutover.

## 2. Steer-Co Outcome

Question:

> After W8-A commit `63f1042a`, should FactHarbor V2 next prepare a W7-B/W8-B
> review package for the first LLM-owned boundary/verdict/report-value phase, or
> take another preparatory/consolidation step first?

Committee:

- GPT-5.5 Captain Deputy / Steer-Co Leader
- Claude Opus 4.6 senior architect and LLM/report-quality expert
- Gemini systems/practicality reviewer

Consent:

- Claude Opus: `support`
- Gemini: `support`
- unresolved dissent: none

Consolidated decision:

- Prepare W7-B/W8-B as the next review package.
- Do not add another hidden preparatory/proof/denial layer before this package.
- Keep the first implementation package bounded and explicitly approval-gated
  because it introduces semantic LLM execution and report-value behavior.

Key evidence:

- W8-A package and handoff state that W8-A is non-report-ready and next should
  be W7-B/W8-B.
- `Docs/AGENTS/V2_Excellence_Scorecard.md` says the current baseline is
  containment/provenance progress, not excellent report-quality progress.
- `Docs/AGENTS/V2_Retirement_Ledger.md` near-term target 1 says the next V2
  slice should move toward real evidence/report value.
- `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md` now point to a
  separately reviewed W7-B / W8-B LLM-owned package as the next real
  report-value direction.

## 3. Why This Is The Right Next Step

W2 through W8-A have established a hidden, traceable chain from Claim
Understanding through Source Material, EvidenceItems, sufficiency, W7-A
boundary/verdict candidate contract, and W8-A stop ownership.

That is now enough scaffolding. Another hidden-only stop/proof layer would
increase mechanism count without advancing the scorecard. The next meaningful
work is to let an approved LLM task produce the first semantic boundary/verdict
candidate set, then assemble an internal Alpha report-result candidate that can
be reviewed against Captain expectations.

## 4. Proposed Phase Split

### W7-B - Boundary / Verdict Candidate Execution

Goal:

- Execute one LLM-owned boundary/verdict task over approved V2 EvidenceItem and
  sufficiency inputs.
- Produce internal-only `BoundarySet` and `VerdictSet` candidates, or a damaged
  result if the task cannot safely produce them.

Allowed conceptually after approval:

- prompt/model/schema/UCM/gateway review package for the boundary/verdict task;
- one provider/model policy for the task;
- no-store/no-read cache posture unless separately approved;
- internal-only input packet with EvidenceItem statements and provenance needed
  by the LLM;
- internal-only output contract with boundary candidates, verdict candidates,
  citations to EvidenceItems, caveats, and material uncertainty signals.

Not allowed in W7-B:

- public/API/UI/report/export/compatibility projection;
- final report prose;
- final truth percentage or confidence publication;
- Source Reliability formulas or fixed epistemic formulas;
- parser/provider/source widening;
- V1 reuse or cleanup.

### W8-B - Internal Alpha Report Result Assembly

Goal:

- Assemble an internal-only Alpha report-result candidate from W7-B candidates.
- Preserve cited EvidenceItem traceability and warning materiality inputs.
- Keep public V2 blocked/precutover/report_damaged until explicit cutover
  approval.

Allowed conceptually after approval:

- internal report-result contract;
- comparator-review metadata;
- cited EvidenceItem references and hash/length/provenance projections;
- report-quality readiness status for admin review.

Not allowed in W8-B without a later package:

- public report rendering;
- UI/API/export/compatibility exposure;
- cutover or V1 cleanup;
- broad narrative polishing outside the approved report-result contract.

## 5. Accepted Inputs

W7-B/W8-B may depend only on the current V2 lineage:

- accepted Claim Understanding / ClaimContract state carried downstream;
- W5-F `EvidenceItemHandoffDecision`;
- W6-B `SufficiencyIntakeDecision`;
- W6-C `SufficiencyAssessmentDecision`;
- W7-A `BoundaryVerdictCandidateDecision`;
- W8-A `InternalAlphaReportStopCandidate`;
- run-context policy/config/prompt/model snapshots once explicitly approved.

W7-B/W8-B must not import, read, call, or consume W4-I runtime/sink/provenance
state directly.

## 6. Output Shape To Design Before Implementation

The implementation package must define exact TypeScript names, but the target
contract families are:

```text
BoundaryVerdictExecutionDecision
  status
    - boundary_verdict_candidates_created
    - boundary_verdict_execution_blocked
    - boundary_verdict_execution_damaged
  inputLineage
  prompt/model/config/cache approval snapshot
  boundarySetCandidate
  verdictSetCandidate
  citedEvidenceItemRefs
  warningMaterialityInputs
  sideEffects
  redaction

InternalAlphaReportResultCandidate
  status
    - alpha_report_candidate_created_internal_review_only
    - alpha_report_candidate_blocked
    - alpha_report_candidate_damaged
  reportQualityStatus
  boundary/verdict refs
  cited EvidenceItem refs
  comparatorReviewReadiness
  publicCutoverStatus = blocked_precutover
  compatibilityProjection = closed
```

The package must decide whether W7-B and W8-B are one implementation slice or
two sequential slices. Steer-Co recommendation: start with W7-B only if the
prompt/schema approval surface is large; combine W7-B+W8-B only if the report
assembly remains a thin internal wrapper over W7-B output.

## 7. Prompt / Model / Schema Gate

W7-B requires a separate, explicit approval package before implementation
because it needs semantic LLM execution.

That package must define:

- prompt section id and UCM location;
- output schema and strict validation;
- model policy, provider policy, timeout, token cap, retry posture, and cost
  budget;
- cache policy, expected no-store/no-read posture, and rationale;
- gateway task activation and approval record;
- failure modes: provider unavailable, parse failure, schema invalid,
  low-evidence insufficiency, citation mismatch, and contradictory verdict
  candidate.

No prompt/model/config/schema/UCM/gateway edit is authorized by this review
package.

## 8. Report Quality Acceptance Targets

The first W7-B/W8-B implementation should target internal review readiness, not
public cutover.

Acceptance criteria must be grounded in:

- `Docs/AGENTS/Captain_Quality_Expectations.md`;
- `Docs/AGENTS/benchmark-expectations.json`;
- `Docs/AGENTS/report-quality-expectations.json`;
- exact Captain-defined inputs only.

Minimum internal Alpha checks:

- every verdict candidate cites supporting or opposing EvidenceItems;
- boundary candidates group compatible EvidenceScopes / EvidenceItems and avoid
  mega-boundary collapse;
- normative/evaluative claims remain explicit about standards, evidence, and
  caveats;
- warning severity follows verdict-impact materiality;
- multilingual inputs do not use English-only deterministic logic;
- public/default-admin/log/error surfaces do not leak source text, EvidenceItem
  statements, prompt text, provider payloads, hidden ledger ids, or internal
  statuses.

## 9. Live-Job Posture

Current ledger status from the active docs: `currentRemaining = 0`.

This package proposes no live job.

The eventual W7-B/W8-B implementation package may request a new tranche and one
or more canaries, but only after:

- implementation is committed;
- runtime is refreshed from the implementation commit;
- route/runtime preflight passes;
- live-job tranche ledger is updated with approval pointer, starting budget,
  remaining budget, and per-canary consumption rule;
- exact Captain-defined input is selected.

Steer-Co may authorize job submission only when the package and tranche ledger
explicitly record that authority.

## 10. V2 SCORECARD IMPACT

Quality dimension advanced:

- `V2-Q4` Boundary formation: intended first real advancement.
- `V2-Q5` Verdict quality: intended first real advancement.
- `V2-Q6` Warning integrity: must preserve materiality-based warning posture.
- `V2-Q8` Public cutover safety: public remains blocked.
- `V2-Q9` Cost/latency discipline: must record model/cost/timing budget.
- `V2-Q10` Complexity convergence: must retire/merge at least one older stop or
  proof mechanism, or document why not.

Direct user/report value:

- no public user value until later cutover, but this is the first slice aimed at
  real internal report-quality evidence.

Hidden-only value:

- acceptable only because it is the transition from containment to semantic
  report-value work, not another proof-only layer.

Cost/latency impact:

- unknown until prompt/model package; must be bounded before live canary.

Retirement or simplification unlocked:

- W8-A should merge into the eventual internal ReportResult owner.
- W4-I remaining core/sink state should be reassessed after W7-B/W8-B no longer
  needs it.
- Boundary guard split/consolidation should be scheduled after the next gate is
  stable.

Scorecard risk:

- premature public report or deterministic semantic logic would damage V2-Q5,
  V2-Q6, and V2-Q8.

## 11. V2 RETIREMENT LEDGER IMPACT

Rows touched:

- `V2-RL-012`: no new W4-I consumer; reassess W4-I core/sink after W7-B/W8-B.
- `V2-RL-013`: boundary guard should not grow broadly; any new assertions must
  be focused and later split/consolidated.
- `V2-RL-014`: avoid long duplicated WIP narrative; archive/consolidate stale
  packages after this bounded orchestration review.

New mechanism owner:

- W7-B/W8-B implementation owner: Lead Developer under Captain Deputy.

Removal / merge trigger:

- W8-A stop owner merges into real internal ReportResult after W8-B.
- W7-A contract-only candidate owner either becomes a compatibility precursor
  to W7-B or is merged into W7-B once W7-B is stable.

Debt accepted:

- review docs only in this package.

## 12. V2 CONSOLIDATION GATE

W7-B/W8-B passes the consolidation gate only if:

- it advances semantic report-value capability;
- it avoids new hidden-only proof lanes;
- it defines an explicit merge path for W7-A and W8-A;
- it avoids direct W4-I access;
- it keeps public V2 blocked until report quality is accepted;
- it includes a concrete boundary-guard/test split or containment plan if guard
  growth is unavoidable.

If the next implementation package only adds another readiness/denial/diagnostic
owner, Steer-Co must reconvene before implementation.

## 13. Latest Debt Sensor Status

`npm run debt:sensors` on 2026-05-20 after W8-A closeout returned
`advisory_warn`:

- V2 source: `151` files / `44771` lines.
- V2 tests: `132` files / `49502` lines.
- Boundary guard: `10745` lines.
- Docs/WIP markdown files: `236`.
- Handoff markdown files: `753`.
- Files scanned: `754`.
- Debt-guard blocks: `161`.
- Net mechanism increases: `14`.
- V2 consolidation-marker review files: `5`.

These warnings are not blockers, but they are steering pressure. W7-B/W8-B must
not grow hidden mechanisms without retiring, merging, or stabilizing older ones.

## 14. Proposed Verifier Plan For Future Implementation

Review package verifiers:

```powershell
npm run debt:sensors
git diff --check
```

Future implementation verifiers must include at least:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/
npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run debt:sensors
npm -w apps/web run build
git diff --check
git status --short --untracked-files=all
```

If a live canary is later approved:

- commit first;
- refresh runtime from the commit;
- verify API/Web runtime commit;
- preflight internal routes and public leak checks;
- run only the canaries explicitly approved in the tranche ledger.

## 15. Approval Boundaries

This package does not approve:

- implementation;
- live jobs or canaries;
- prompt/model/config/schema/UCM/gateway edits or approval flips;
- LLM boundary/verdict/report execution;
- generated public report prose;
- public/API/UI/report/export/compatibility behavior;
- public truth percentage, confidence, warning, verdict, or cutover behavior;
- parser/cache/SR/storage behavior;
- provider expansion, W2/W3 widening, ACS/direct URL support;
- V1 work, V1 reuse, V1 cleanup, or V1 removal.

## 16. Stop / Escalation Triggers

Stop and reconvene Steer-Co or escalate to Captain if:

- reviewers disagree on whether W7-B and W8-B should be separate packages;
- implementation would require public exposure or cutover behavior;
- implementation needs prompt/model/config/schema/UCM/gateway changes without a
  recorded approval package;
- implementation would use deterministic semantic logic for boundary/verdict
  meaning;
- implementation would add fixed epistemic/truth/confidence formulas;
- direct W4-I runtime/sink/provenance access appears necessary;
- source text, EvidenceItem statements, prompt text, provider payloads, hidden
  ledger ids, or internal statuses could leak through public/default-admin/log
  or error surfaces;
- debt sensors or boundary guard growth indicate another hidden mechanism is
  being added without a merge/retirement trigger;
- a live job is proposed without an updated tranche ledger and approval pointer.

## 17. Recommended Review Outcome

Approve with modifications likely:

1. Require a dedicated prompt/model/schema/gateway approval package before W7-B
   implementation.
2. Prefer W7-B as the first implementation slice, unless W8-B is only a thin
   internal wrapper over W7-B output.
3. Require W7-B to target Captain-defined report-quality expectations and
   comparator families.
4. Keep public V2 blocked/precutover/report_damaged.
5. Require a new live-job tranche ledger entry before any canary.
6. Require an explicit merge path for W7-A/W8-A and no new W4-I consumer.

## 18. Copy-Ready Lead Developer Packet After Approval

```text
As Lead Developer,
Skill: debt-guard

Prepare the W7-B implementation approval package only. Do not implement.

Goal:
Define the first LLM-owned V2 boundary/verdict candidate execution package after
W8-A. Scope it to internal-only BoundarySet/VerdictSet candidates over the
current W5-F/W6-B/W6-C/W7-A/W8-A lineage. The package must decide whether W8-B
internal report-result assembly is included as a thin wrapper or split into a
separate follow-up.

Required package sections:
- exact accepted inputs and parent lineage checks;
- proposed prompt section, UCM location, output schema, model policy, gateway
  activation, cache posture, timeout/token/cost budget, and failure modes;
- internal output contracts and redaction/leak boundaries;
- citation requirements to EvidenceItems;
- report-quality acceptance criteria against Captain expectations and
  benchmark/comparator docs;
- V2 SCORECARD IMPACT;
- V2 RETIREMENT LEDGER IMPACT;
- V2 CONSOLIDATION GATE;
- latest `npm run debt:sensors` status;
- verifier plan;
- live-job tranche/canary proposal, if any, with explicit approval pointer needs;
- exact approval boundaries and stop triggers.

Forbidden in this package:
implementation, live jobs, prompt/model/config/schema/UCM/gateway edits,
approval flips, public/API/UI/report/export/compatibility behavior, parser/cache
/SR/storage/provider widening, ACS/direct URL, V1 work, V1 cleanup, fixed
epistemic formulas, deterministic semantic boundary/verdict logic, and direct
W4-I access.

Run:
npm run debt:sensors
git diff --check

Return the package delta, Steer-Co review needs, and whether Captain approval is
needed before implementation.
```
