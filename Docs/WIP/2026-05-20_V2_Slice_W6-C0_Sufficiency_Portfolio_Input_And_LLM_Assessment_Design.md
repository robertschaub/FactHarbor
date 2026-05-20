# V2 Slice W6-C0 Sufficiency Portfolio Input And LLM-Owned Assessment Design

Date: 2026-05-20
Status: review-package-only
Package author: Captain Deputy
Steer-Co reviewers: Claude Opus 4.6 Lead Architect / LLM Governance, Gemini Product Trust / Complexity
Future implementer: Lead Developer, only after separate Captain approval
Canary runner: none; no live job is proposed by W6-C0

## 1. Decision

W6-B is complete at commit `d1458c96`.

W6-C0 is the next bounded package proposal. It is a review-only design package
for the future sufficiency phase. It does not authorize implementation, live
jobs, prompt/model/config/schema/UCM/gateway edits, text-exposure widening,
public behavior, or W6-C execution.

The next real implementation must be separately approved by Captain because
W6-C implementation and LLM sufficiency execution are hard approval gates.

## 2. Why W6-C0 Exists

W6-B created a contract-only intake:

```text
EvidenceItemHandoffDecision -> SufficiencyIntakeDecision
```

W6-B intentionally exposes only hash, length, provenance, and lineage fields by
default. That is correct for containment, but it is not enough for an LLM-owned
sufficiency judgment. A real sufficiency assessment needs a reviewed design for
bounded internal evidence text exposure, task-contract ownership, and report-stop
semantics before any code opens W6-C.

W6-C0 closes the design gap without adding another hidden runtime mechanism.

## 3. What This Gate Unlocks

W6-C0 unlocks only a later approval decision:

- whether W6-C should proceed as an LLM-owned sufficiency assessment package;
- what exact future input contract can carry bounded EvidenceItem statements to
  the sufficiency LLM;
- how the existing `EvidenceSufficiencyAssessment` task contract is used;
- how sufficiency can stop later report/verdict candidates without fixed
  epistemic formulas.

W6-C0 does not unlock implementation, text exposure, public output, or live jobs.

## 4. What Older Guard Or Artifact It Retires Or Merges

W6-C0 does not retire code by itself. It sets the review criteria for the W6-C
decision on `V2-RL-012`:

- merge W4-I core/sink lineage state into a stable downstream owner;
- narrow W4-I to a smaller structural helper;
- quarantine W4-I as historical proof machinery;
- or keep W4-I only with a sharper removal trigger.

W6-C must not add new W4-I consumers. W6-C may only use W4-I lineage through
already accepted downstream parents unless a separate reviewed package changes
that boundary.

## 5. Accepted Parent Contract

W6-C0 accepted parent is exactly:

- `SufficiencyIntakeDecision`
- decision version `v2.evidence-lifecycle.sufficiency-intake.w6b`
- ready status `sufficiency_intake_ready_for_contract_only_assessment`
- `assessmentExecution = closed_contract_only`
- `visibility = internal_admin_only`
- `publicPointerExposure = forbidden`
- `publicCutoverStatus = blocked_precutover`
- `defaultProjection = hash_length_provenance_only`

No W6-C0 design may rely on direct reads, imports, calls, or sink access to
W4-I. No W6-C0 design may bypass `SufficiencyIntakeDecision` with an unreviewed
side-channel to W5 material.

If future W6-C needs EvidenceItem statements, that is not part of the accepted
W6-B parent. It is a separate text-exposure widening gate.

## 6. Text-Exposure Widening Gate

W6-C0 names but does not open the text-exposure widening gate.

Future W6-C implementation must not receive EvidenceItem statements, source
text, snippets, summaries, provider payloads, prompt text, hidden ledger ids, or
internal statuses unless Captain separately approves an implementation package
that defines all of the following:

- exact text payload: minimum bounded EvidenceItem statements required for the
  sufficiency LLM, plus only the provenance fields needed to cite support;
- byte and item caps: inherited from the accepted W5/W6 parents unless a
  separate package explicitly changes the cap;
- redaction posture: public JSON, UI, reports, exports, compatibility
  projections, logs, errors, and default admin routes remain text-free;
- retention posture: task input text is not persisted beyond the bounded
  internal artifact unless separately approved;
- prompt/model/schema approval: sufficiency execution must use approved
  prompt/model/schema/UCM/gateway policy before any provider call;
- verifier posture: tests must prove that text reaches only the approved LLM
  input path and never default/public/admin/log/error surfaces.

This gate is load-bearing. It must be approved before W6-C implementation.

## 7. Existing Task Contract Reconciliation

The codebase already defines:

- `EvidenceSufficiencyAssessment`
- `EvidenceSufficiencyResult`
- `EvidenceSufficiencyResultSchema`
- schema version `v2.evidence_sufficiency_assessment.0`
- task key `evidence_sufficiency`

W6-C0 must not duplicate these silently.

Recommended ownership:

- `EvidenceSufficiencyResult` remains the LLM task-result payload contract.
- A future `SufficiencyAssessmentDecision` envelope, if approved, wraps the task
  result with lineage, redaction, visibility, side effects, policy snapshots,
  stop/report-readiness fields, and parent `SufficiencyIntakeDecision` identity.
- The task result owns LLM judgment content.
- The decision envelope owns containment, governance, public cutover status, and
  downstream stop/go routing.

Any future change to the task contract schema is a prompt/model/schema approval
gate and is not authorized by W6-C0.

## 8. Future SufficiencyAssessmentDecision Shape

Future W6-C implementation, if approved, should define the smallest envelope
needed for internal sufficiency ownership:

- `decisionVersion`
- `decisionId`
- `kind = sufficiency_assessment`
- `assessmentStatus`
- `blockedReason`
- `damagedReason`
- `visibility = internal_admin_only`
- `publicPointerExposure = forbidden`
- `publicCutoverStatus = blocked_precutover`
- `defaultProjection = hash_length_provenance_only`
- parent `SufficiencyIntakeDecision` id and version
- admitted EvidenceItem count, statement hashes, and byte lengths
- `taskKey = evidence_sufficiency`
- task-result schema version
- `EvidenceSufficiencyResult` payload hash and accepted/blocked/damaged status
- cited EvidenceItem/provenance support ids or hashes
- report-stop fields indicating whether later report/verdict candidate creation
  must stop for insufficiency, caveat, refinement, or damaged task state
- redaction booleans proving no text is returned by default
- side-effect booleans for LLM call, prompt rendering, cache read/write,
  Source Reliability, report, verdict, warning, confidence, public surface,
  parser, provider, and storage

The envelope must not contain truth percentage, confidence percentage, verdict
direction, warning display behavior, Source Reliability weighting, or fixed
sufficiency score fields.

## 9. LLM-Owned Judgment Dimensions

W6-C must replace fixed sufficiency formulas with LLM-owned structured
judgments.

The stop-line phrase "fewer than two independent provenance groups" is not a
code formula. It must become an LLM-owned judgment dimension such as effective
independent origin coverage, with cited EvidenceItem/provenance support.

The future sufficiency task should judge, at minimum:

- evidence scarcity versus system/source-acquisition failure;
- source concentration and derivative-source risk;
- language coverage and source-language limitations;
- temporal applicability and temporal gaps;
- inferential fit, proxy/causal bridge strength, and external validity;
- expected-evidence gaps for the claim type;
- whether the evidence portfolio supports continuing, caveating, refining, or
  stopping before verdict/report candidate generation.

Code may validate structure, lineage, redaction, counts, caps, approval state,
and side effects. Code must not classify text meaning, score sufficiency, count
"effective independent origins" as a fixed threshold, or assign truth/confidence
adjustments.

## 10. Future Report-Stop Semantics

W6-C is allowed to design stop semantics only for later internal report
candidates. It must not generate a report, verdict, warning, confidence, public
compatibility projection, UI state, export, or public API result.

Future report-stop fields should distinguish:

- stop because evidence is insufficient;
- stop because source concentration makes a verdict unsafe;
- stop because expected evidence is missing or inaccessible;
- caveat because the evidence is usable but limited;
- continue because the portfolio is adequate for the next internal stage.

These are LLM-owned task outputs or envelope states derived from approved task
outputs. They are not fixed formulas.

## 11. V2 SCORECARD IMPACT

Quality dimension advanced:

- `V2-Q3` Evidence extraction: moves from extracted EvidenceItems to an explicit
  sufficiency gate before downstream use.
- `V2-Q5` Verdict quality: prevents later verdict/report candidates from using
  weak, concentrated, stale, or poorly fitting evidence without a documented
  stop/caveat.
- `V2-Q6` Warning integrity: keeps warning/report behavior closed while
  designing the future evidence-quality signal boundary.
- `V2-Q8` Public cutover safety: public V2 remains blocked/precutover.
- `V2-Q10` Complexity convergence: forces W4-I and older proof-chain debt into a
  merge/narrow/quarantine decision before more report machinery accumulates.

Direct user/report value:

- No direct public value yet. W6-C0 is a design gate for future report-quality
  value.

Hidden-only value:

- Acceptable because it prevents a premature sufficiency executor and avoids
  duplicating the existing task contract.

Cost/latency impact:

- None in W6-C0. Future W6-C must estimate LLM cost/timing before execution.

Retirement or simplification unlocked:

- Defines the criteria needed to merge, narrow, or quarantine W4-I core/sink
  lineage after W6-C owns sufficiency.

Scorecard risk:

- W6-C0 could become another hidden design layer without implementation value.
  Stop if it does not produce a clear implementation approval boundary.

## 12. V2 RETIREMENT LEDGER IMPACT

Rows touched:

- `V2-RL-004`: no new admin route is proposed.
- `V2-RL-009`: W4 readiness/shell/denial chain remains merge-only.
- `V2-RL-010`: W4-G remains source-text lineage parent through existing W5/W6
  lineage only.
- `V2-RL-011`: W4-H remains extraction-input lineage parent through existing
  W5/W6 lineage only.
- `V2-RL-012`: W4-I core/sink must be merged, narrowed, kept with a sharper
  trigger, or quarantined by the W6-C approval package.
- `V2-RL-013`: boundary guard size remains an advisory pressure point; future
  W6-C guard additions must be focused.
- `V2-RL-014`: WIP/handoff volume remains advisory pressure; avoid duplicating
  W2/W3/W4 narrative in status docs.

Status changes:

- None authorized by W6-C0.

New mechanism owner:

- None. W6-C0 is docs-only.

Removal / merge trigger:

- Future W6-C implementation package must include explicit W4-I merge/narrow/
  quarantine criteria based on whether sufficiency can validate W5-F/W6-B
  lineage without W4-I sink access.

Debt accepted:

- One additional WIP design package. No runtime mechanism added.

## 13. V2 CONSOLIDATION GATE

Substantial package:

- Yes, because it frames the next sufficiency phase and report-quality path.

Hidden mechanism added:

- None.

Value produced:

- Prevents accidental formulaic sufficiency and prevents duplication of the
  existing `EvidenceSufficiencyAssessment` task contract.

Retires / merges / demotes / quarantines:

- No immediate deletion. It creates mandatory W4-I retirement decision criteria
  for the later W6-C implementation package.

Steer-Co exception:

- Not needed for new hidden machinery because W6-C0 adds no runtime mechanism.
  Steer-Co review was used because W6-C is a phase transition and sufficiency is
  report-quality critical.

## 14. Latest Debt Sensor Status

Latest run after W6-C0 package creation:

```text
npm run debt:sensors
Status: advisory_warn
Generated: 2026-05-20T13:28:28.936Z
V2 source: 148 files / 42718 lines
V2 tests: 129 files / 47647 lines
Boundary guard: 10341 lines
Docs/WIP markdown files: 232
Handoff markdown files: 745
Net mechanism increases: 14
V2 consolidation-marker review files: 5
```

Advisory warnings remain steering context, not blockers. W6-C0 must not worsen
the mechanism count.

## 15. Future Verifier Plan

W6-C0 docs-only verifier:

```powershell
npm run debt:sensors
npm run index
git diff --check
git status --short --untracked-files=all
```

Future W6-C implementation verifier, if Captain later approves implementation:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/sufficiency/*.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
npm run debt:sensors
npm -w apps/web run build
git diff --check
git status --short --untracked-files=all
```

Additional future W6-C tests must prove:

- W6-C consumes accepted W6-B parent only;
- any text exposure is behind the separately approved text-exposure widening
  gate;
- default/admin/public/log/error projections stay text-free;
- existing `EvidenceSufficiencyResult` is wrapped or explicitly reused rather
  than duplicated;
- no fixed sufficiency formula is implemented;
- no truth/confidence/verdict/report/warning behavior is added;
- no W4-I direct import/read/call/sink access is added.

## 16. Approval Boundaries

W6-C0 authorizes:

- docs-only package review;
- Steer-Co consolidation;
- future Lead Developer prompt drafting for an implementation package only after
  Captain approval.

W6-C0 does not authorize:

- W6-C implementation;
- LLM sufficiency execution;
- text-exposure widening;
- prompt/model/config/schema/UCM/gateway edits or approval flips;
- live jobs or tranche reset;
- public behavior, cutover, UI/API/report/export/compatibility projection;
- provider/parser/ACS/direct URL widening;
- V1 cleanup;
- Source Reliability/truth/confidence/sufficiency formulas;
- fixed epistemic formulas;
- report/verdict/warning/confidence behavior;
- new hidden route or product/orchestrator wiring;
- direct W4-I imports, reads, calls, or sink access.

## 17. Stop Conditions

Hard-stop and reconvene Steer-Co or Captain if:

- W6-C0 drifts from review-only into code, prompt, schema, config, UCM, gateway,
  or runtime changes;
- a package proposes fixed sufficiency formulas, provenance-group thresholds,
  count-based rules, score cutoffs, or deterministic semantic text analysis;
- `SufficiencyAssessmentDecision` includes direct verdict, truth, confidence,
  warning-display, or Source Reliability weighting fields;
- text-exposure widening is proposed without a named separate approval gate;
- W6-C design introduces parent-contract side-channel reads bypassing
  `SufficiencyIntakeDecision`;
- existing `EvidenceSufficiencyAssessment` / `EvidenceSufficiencyResult` is
  silently duplicated instead of wrapped or explicitly reconciled;
- sufficiency becomes a hidden scoring engine without report-visible value;
- `debt:sensors` worsens and no retirement/merge trigger is included;
- W4-I core/sink state is expanded or consumed directly instead of merged,
  narrowed, quarantined, or sharply bounded;
- any live job, public behavior, or W6-C implementation is proposed before
  Captain approval.

## 18. Steer-Co Review Record

Pre-package steering review:

- Claude Opus 4.6 Lead Architect / LLM Governance: `modify`.
- Gemini Product Trust / Complexity: `approve` with required scorecard,
  retirement-ledger, and redaction detail.

Consolidated result:

- proceed with W6-C0 as review-only;
- incorporate Claude's required changes on parent-contract ambiguity, existing
  task-contract reconciliation, text-exposure widening, scorecard/retirement
  sections, and stop conditions;
- do not prepare an implementation prompt until Captain separately approves W6-C
  implementation or a narrower text-exposure approval package.

## 19. Recommendation

Approve W6-C0 as the next bounded proposal for review. Do not implement W6-C yet.

The next Captain approval question, after W6-C0 review is accepted, should be
whether to authorize a W6-C implementation package that opens the named
text-exposure widening gate and wraps the existing `EvidenceSufficiencyResult`
inside a `SufficiencyAssessmentDecision` envelope.
