# V2 Stop-Line And Executable Plan

Date: 2026-05-20
Status: amended by 2026-05-22 HighJump bar-ladder plan
Owner: Lead Architect / Captain Deputy
Scope: V2 only

## 0. 2026-05-22 HighJump Amendment

Captain changed the active V2 direction after the W6-C HighJump evidence. The
historical stop-line plan below remains useful context, but its "pause/no live
jobs/no prompt edits" posture is superseded for the current workstream by:

- `Docs/WIP/2026-05-22_V2_HighJump_Bar_Ladder_Plan.md`
- `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`

New active direction:

- lower only the bars that prevent the first internal V2 report result;
- keep public V2 blocked/precutover/report_damaged;
- allow topic-neutral prompt edits under normal prompt hygiene;
- allow up to `12` live jobs in the new tranche;
- after the first successful internal report result, raise bars step by step
  where report-review evidence shows they are needed.

This amendment does not authorize public cutover, V1 cleanup, cache/SR/storage,
parser execution, ACS/direct URL widening, provider expansion beyond a reviewed
package, or model/config/schema/UCM/gateway changes beyond prompt edits.

## 1. Decision

Historical decision as of 2026-05-20: V2 source/runtime implementation should
pause now.

This was not a permanent stop. It was a governance and convergence stop after a
clean tranche boundary. The current active plan is now the HighJump bar-ladder
plan above.

- X7-W5-G proved the live hidden EvidenceItem handoff projection.
- X7-W5-H retired the standalone W4-I internal admin route and route test.
- Public V2 remains intentionally blocked:
  `_schemaVersion = 4.0.0-cb-precutover`,
  `publicCutoverStatus = blocked_precutover`, and
  `analysisIssueCode = report_damaged`.
- The active V2 live-job tranche has `currentRemaining = 0`.
- Latest observed `npm run debt:sensors` in this review is `advisory_warn`.

V2 should resume only under a reviewed V2-only implementation package whose
single target is an internal direct-text Alpha `ReportResult` candidate. After
that candidate exists, implementation stops again for report-review, comparator
review, cutover review, and live-job authorization.

## 2. Stop Now Versus Later

| Topic | Do now | Defer until after V2 public pipeline is complete |
|---|---|---|
| Governance stop after W5-G/W5-H | Low risk. Preserves a coherent proof point and prevents unreviewed expansion. | High risk. Later stopping likely happens after more hidden machinery and weaker retirement leverage. |
| EvidenceItem handoff to downstream owner | Medium-low risk if limited to internal contract ownership and focused tests. | High risk. Later verdict/report code may invent its own evidence assumptions. |
| EvidenceCorpus/Sufficiency ownership | Medium risk now because it crosses into analytical quality; manageable with LLM-owned semantics and no live jobs. | High risk. Retrofitting sufficiency after verdict/report exists invites confidence and warning churn. |
| Source independence, language, and temporal coverage | Medium risk now if implemented as bounded LLM-owned fields and structural lineage. | High risk. Later reports may have already learned source-count inflation patterns. |
| Inferential fit and proxy/causal bridge | Medium risk now if kept in sufficiency/verdict contracts and not a new deterministic stage. | High risk. Later V2 may produce fluent but weak warrant narratives. |
| Normative/evaluative claim handling | Medium-high risk now if overbuilt; reserve/report-contract design is acceptable. | High risk. Public reports may flatten fairness, pointlessness, or justice claims into false precision. |
| Warning materiality | Medium risk now; must reuse canonical severity policy and avoid diagnostic noise. | High risk. Later adapters may surface or suppress warnings inconsistently. |
| Public cutover and V1 cleanup | High risk now. V2 has no reviewed internal ReportResult candidate. | Low to medium risk only after cutover evidence, comparator review, and replacement coverage exist. |
| ACS/direct URL/provider widening | High risk now. It expands input/source surface before report value is proven. | Medium risk later, after direct-text Alpha proves canonical ownership. |
| Persistent temporal revision/history | Very high risk now. It is outside the minimum direct-text Alpha path. | Low to medium risk after V2 owns stable public reports. |

## 3. Non-Goals

This plan does not authorize:

- ACS/direct URL/provider/parser widening;
- public UI, API, report, export, compatibility projection, or schema changes;
- V1 cleanup;
- source-reliability weighting of verdict/truth/confidence;
- fixed truth/confidence adjustment formulas for Source Reliability, source
  independence, proxy fit, evidence sufficiency, or evidence scarcity;
- persistent temporal revision/history;
- new live jobs;
- new prompt/model/config/schema behavior without approval;
- new hidden admin routes by default.

## 4. Current First-Review Consensus

Reviewers consented to pausing source/runtime implementation now and resuming
only through a bounded V2-only stop-line plan. Material dissent was not against
the pause; it was against treating the next Alpha candidate as report-ready or
using it as another hidden proof lane.

Consolidated conditions from review:

- No live job while the tranche ledger remains at `0`.
- No public output change, cutover flag change, export behavior, or V1 cleanup.
- No new hidden route, proof, denial, guard, or diagnostic without a retirement
  ledger row, owner, and removal or merge trigger.
- No deterministic semantic analysis logic. Sufficiency, inferential fit,
  independence, normative framing, and warning materiality remain LLM-owned or
  report-contract-owned.
- No fixed epistemic adjustment formulas. V2 must not calculate truth,
  confidence, sufficiency, source independence, proxy fit, or source-reliability
  impact by formula unless Captain separately approves that policy after review.
  These adjustments must be LLM-owned structured judgments with cited
  EvidenceItem/provenance support. Code may validate structure, lineage,
  redaction, counts, and approved policy boundaries only.
- No prompt/model/config/schema behavior change without the normal approval
  gate. Analysis-affecting strings, web-search text, model routing, and tunable
  behavior must follow the UCM/prompt/config placement rules.
- No cache, source-reliability, storage, provider, parser, ACS, or direct URL
  widening unless explicitly named in an approved package.

## 5. Next Positive Stop Line

The next positive stop line is:

```text
Internal Direct-Text Alpha ReportResult Candidate
```

Definition:

One Captain-approved direct-text input, selected verbatim from the current
Captain-defined analysis input list or newly approved verbatim by Captain, can
travel internally through the V2 path:

```text
Claim Understanding
-> previously approved direct-text internal acquisition/evidence artifacts only
-> W5-F EvidenceItem handoff contract
-> Sufficiency/portfolio assessment
-> ClaimAssessmentBoundary/Verdict candidate contract
-> internal ReportResult candidate
```

The currently live-proven artifact is the W5-F handoff projection, with W5-G as
the passed canary evidence. This plan does not claim a complete EvidenceCorpus
or adequate corpus breadth.

This stop line does not authorize public reporting. It proves only that V2 has a
single canonical internal result owner with evidence traceability and warning
materiality ready for review.

Alpha candidate minimum evidence:

- accepted Claim Understanding handoff;
- accepted W5-F EvidenceItem handoff or an explicit blocked reason;
- sufficiency output distinguishing evidence scarcity, source concentration,
  inaccessible evidence, system failure, expected-evidence gaps, language
  coverage, and temporal fit;
- verdict/report candidate cites EvidenceItem ids or explicitly stops for
  insufficiency;
- every factual or normative-supporting narrative assertion cites EvidenceItem
  ids, or is marked as synthesis/limitation;
- warning events are canonical and materiality-classified;
- report-quality status explicitly says internal Alpha, not public report-ready;
- public result remains blocked/precutover/report_damaged;
- no source text, EvidenceItem text, snippets, summaries, prompt text,
  provider payloads, hidden ledger ids, or internal statuses leak to public or
  default-admin projections;
- focused unit/fixture/internal verifiers pass without live jobs unless a new
  tranche is approved after commit, runtime refresh, and reviewed package.

Alpha is not evidence of cutover readiness. Fixture-only Alpha evidence must not
be treated as live report-quality proof.

## 6. Executable Work Packages

### W6-A: Stop-Line Acceptance Package

Owner: Lead Architect / Captain Deputy

Allowed work:

- freeze this decision in WIP/handoff records;
- reference W5-G/W5-H evidence and current live-job ledger;
- define the next implementation package and its non-goals.

Forbidden work:

- source/runtime edits;
- live jobs;
- prompt/model/config/schema edits;
- public output behavior changes.

Exit criteria:

- this plan is reviewed by diverse reviewers;
- material dissent is resolved or explicitly escalated;
- Captain or delegated governance accepts the next implementation package.

Stop trigger:

- if reviewers do not consent to the internal direct-text Alpha stop line.

### W6-B: EvidenceItem Handoff To Sufficiency Contract

Owner: Lead Developer

Likely code ownership:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff.ts`
- sufficiency module/contract owner under
  `apps/web/src/lib/analyzer-v2/evidence-lifecycle/`, named exactly in the
  implementation package before code work starts;
- focused tests under
  `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/`.

Before code work:

- either reuse an existing named owner or add/update a retirement-ledger row
  with owner, merge/removal trigger, and accepted debt;
- run `npm run debt:sensors` and record salient warnings;
- complete this package gate:

| Field | Required before execution |
|---|---|
| taskId | Named or marked contract-only |
| prompt source/hash | Approved source and hash, or `none_contract_only` |
| schema version | Named |
| UCM profile/defaults | Named, or `none_contract_only` |
| model-policy id | Named, or `none_contract_only` |
| cache/no-store policy | Default no-store |
| execution eligibility | Contract/test-only unless approved |
| allowed files | Named in package |
| blocked surfaces | Public/API/UI/export/default-admin leakage |
| verifier set | Focused tests plus redaction/side-effect checks |

Input:

- `EvidenceItemHandoffDecision` with
  `handoffStatus = evidence_items_ready_for_downstream_internal_handoff`;
- W5-F hash/length/provenance-only projection;
- W5-G canary evidence as proof that W5-F was live-reachable, not as a
  substitute for current runtime evidence;
- W4-H/W5 lineage metadata already available.

Output:

- internal-only sufficiency intake contract;
- blocked/damaged status when W5-F is missing, damaged, or lineage-incomplete;
- side-effect ledger proving no report, verdict, warning, confidence, public,
  cache, SR, provider, parser, or storage behavior.

Acceptance tests:

- accepted W5-F creates sufficiency intake;
- missing W5-G-backed canary evidence cannot be silently treated as successful
  downstream readiness;
- blocked/damaged W5-F blocks downstream;
- lineage mismatch stops;
- public/default projections remain redacted;
- no new route unless the package states the retirement impact and proves the
  route is necessary.

Retirement impact:

- must decide whether remaining W4-I core/sink lineage state is merged,
  narrowed, kept with sharper removal trigger, or quarantined.

Stop trigger:

- any need for source text or EvidenceItem text in default/public projection;
- any semantic sufficiency decision implemented with keywords, regex, or
  hardcoded topic categories.

### W6-C: Portfolio Sufficiency Assessment

Owner: Lead Developer with LLM Expert review

Allowed work:

- contract-only internal sufficiency decision structure unless an approved V2
  sufficiency task already exists;
- LLM-owned or approved-task-owned assessment of evidence adequacy only after
  prompt/model/UCM/schema approval;
- structural validation, lineage checks, redaction checks, and no-side-effect
  checks.

Before execution:

- run `npm run debt:sensors` and record salient warnings;
- complete the same package gate table required by W6-B;
- default to no-store. Cache may be introduced only by approved package and
  must key on input contract, prompt hash, schema version, model-policy id, UCM
  profile, and provenance lineage.

Required Sufficiency intake metadata:

- source record id;
- provider id;
- source language;
- retrieval time;
- source published/updated time when available;
- source-material lineage hash;
- EvidenceItem lineage hash;
- source/access status;
- origin-group assessment or explicit `unknown` with stop/caveat handling.

Required dimensions:

- effective independent origin count;
- independent-origin coverage;
- source concentration or derivative-source risk;
- source-language coverage;
- temporal applicability/freshness;
- evidence scarcity versus system failure;
- provider-path narrowness versus real-world scarcity;
- inaccessible/source-access limitation;
- expected evidence profile gap;
- source-reliability signals as observable metadata only;
- whether downstream verdict/report may proceed.

Epistemic adjustment rule:

- W6-C must not introduce fixed truth/confidence adjustment formulas for Source
  Reliability, source independence, proxy fit, evidence sufficiency, or evidence
  scarcity. Any adjustment to proceed/block, confidence, warning materiality, or
  later verdict/report framing must come from an approved LLM-owned structured
  judgment with cited EvidenceItem/provenance support, or from an explicitly
  Captain-approved policy.

Acceptance tests:

- insufficient evidence blocks verdict/report candidate generation;
- no verdict-bearing Alpha `ReportResult` proceeds with fewer than two
  effective independent provenance groups; a non-verdict insufficiency
  `ReportResult` candidate may proceed if it explicitly stops for scarcity or
  source concentration;
- effective independent origin count is not raw source count and is not
  EvidenceItem count;
- duplicate or derivative evidence cannot inflate effective coverage by raw
  source count alone;
- language and temporal fields are represented without English-only defaults;
- unknown or provider-default source-language coverage blocks, requests
  refinement, or creates a material caveat;
- retrievedAt plus published/updated time when available are preserved, and
  freshness/applicability is assessed for time-sensitive claims;
- scarce accessible evidence is distinguished from a narrow provider path;
- low institutional legibility or regional/language minority status is not an
  automatic reliability penalty;
- source reliability is observable only and not direct verdict weighting.

Approval gate:

- if this requires new prompt text, web-search text, model policy, UCM defaults,
  config, or schema behavior, stop until approved and stored in the correct
  prompt/UCM/config tier.

Stop trigger:

- sufficiency becomes a hidden scoring engine without report-visible value;
- `debt:sensors` worsens and no retirement/merge trigger is included.

Fixture expectations:

- duplicate/derivative source corpus;
- single-source corpus;
- non-English corpus;
- stale-source corpus;
- inaccessible-source corpus.

### W7-A: Boundary And Verdict Candidate Contract

Owner: Lead Developer with Lead Architect and LLM Expert review

Allowed work:

- internal-only candidate contracts that consume accepted sufficiency output;
- stop-on-insufficiency behavior;
- evidence-id traceability from verdict candidate back to EvidenceItems;
- challenger/warrant-bridge fields as LLM-owned outputs if prompt approval is
  granted.

Before execution:

- complete the same package gate table required by W6-B.

Forbidden work:

- public truth/confidence changes;
- adapter-side verdict interpretation;
- deterministic semantic routing;
- public cutover or V1 cleanup.

Acceptance tests:

- no verdict candidate when sufficiency blocks;
- verdict candidate cites EvidenceItem ids;
- inferential/proxy/normative caveats are preserved as contract fields, not
  hardcoded branch behavior;
- original language is preserved through claim, evidence, verdict, and report
  candidate contracts;
- translation is not a prerequisite for analysis;
- public shell remains blocked/precutover/report_damaged.

Stop trigger:

- any prompt/model/config change without approval;
- any unsupported scalar truth percentage for a normative/evaluative claim;
- schema retry attempts reinterpret semantics rather than repairing structural
  JSON/schema defects only.

### W8-A: Internal ReportResult Candidate

Owner: Lead Developer with Product Trust reviewer

Allowed work:

- one canonical internal `ReportResult` candidate writer;
- internal-only status such as `alpha_candidate_not_report_ready`;
- reportQualityStatus and comparator-review readiness marker;
- warning events using canonical materiality rules;
- citation/evidence references from narrative/verdict back to EvidenceItems;
- named internal field/section for empirical baseline versus
  normative/evaluative contestation;
- internal status that clearly says Alpha candidate, not public-ready report.

Before execution:

- complete the same package gate table required by W6-B.

Forbidden work:

- public report projection;
- compatibility adapters, exports, UI, public schema projection, or public
  routes that expose V2 Alpha semantics;
- V1 cleanup;
- live jobs unless a new tranche is explicitly approved.

Acceptance tests:

- report candidate exists only internally;
- public result remains `blocked_precutover` and `report_damaged`;
- Alpha `ReportResult` does not satisfy public report completeness gates;
- Alpha is ineligible for compatibility projection except redacted/admin
  review;
- warning severity/visibility is preserved through the internal compatibility
  path and not recomputed by adapters;
- warning severity follows verdict-materiality policy;
- adapters do not infer verdict/truth/confidence outside canonical result;
- every factual or normative-supporting narrative assertion cites EvidenceItem
  ids, or is marked as synthesis/limitation;
- normative/evaluative claims preserve empirical baseline versus normative
  contestation rather than collapsing into false precision;
- no Alpha leakage through default-admin projections.

Positive stop:

- once one internal direct-text Alpha `ReportResult` candidate is produced with
  focused verifiers passing, implementation stops for report-review/cutover
  decision.

After W8-A:

- run `npm run debt:sensors` and record status;
- mandatory review checkpoint on whether the boundary guard split should move
  from later convergence task into the next package.

### W9-A: Report Review And Cutover Decision Package

Owner: Lead Architect / Captain Deputy / Product Trust reviewer

Allowed work:

- review the Alpha candidate against
  `Docs/AGENTS/Captain_Quality_Expectations.md`,
  `Docs/AGENTS/benchmark-expectations.json`, and
  `Docs/AGENTS/report-quality-expectations.json`;
- state exact versus variant comparator availability before judging quality;
- compare local versus deployed and current-stack versus historical comparator
  status;
- include a normative/evaluative review check for fair-trial and pointless
  families when those are the selected Captain-approved inputs;
- request a new live-job tranche only if the package meets live-job discipline.

Forbidden work:

- public cutover;
- V1 cleanup;
- broad source/input widening.

Exit criteria:

- explicit decision: continue Alpha, authorize live canary, revise contracts,
  quarantine, or prepare a cutover package.

Limit:

- W9-A may recommend cutover-package preparation. It cannot itself authorize
  public cutover.

## 7. Hard Stop Conditions

Stop immediately and reconvene Steer-Co if any condition occurs:

- live-job execution is proposed while
  `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json` has `currentRemaining = 0`;
- public output changes from blocked/precutover/report_damaged;
- V1 analyzer cleanup or replacement is proposed before V2 owns the equivalent
  public path;
- new hidden route/proof/diagnostic/guard machinery lacks a retirement ledger
  row and removal/merge trigger;
- a W6-B/W6-C package cannot name the exact sufficiency module/contract owner
  before code work starts;
- any deterministic semantic text-analysis logic is added;
- any fixed epistemic adjustment formula is added for Source Reliability, source
  independence, proxy fit, evidence sufficiency, evidence scarcity, truth, or
  confidence without explicit Captain-approved policy;
- any prompt/model/config/schema behavior change lacks approval;
- semantic labels for sufficiency, source independence, derivative-source risk,
  inferential/proxy fit, normative/evaluative framing, warning materiality,
  source-language adequacy, or temporal applicability are not LLM-task outputs
  or report-contract fields;
- report candidate lacks EvidenceItem traceability, warning materiality,
  reportQualityStatus, comparator-review readiness marker, or internal Alpha
  not-public-ready status;
- Alpha candidate uses fixture-only evidence and is treated as live report
  quality proof;
- source-language coverage or temporal applicability is silently defaulted;
- source reliability is used as direct verdict weighting before policy approval;
- Alpha `ReportResult` requires new public compatibility adapters, exports, UI,
  or public schema projection;
- a verifier fails and the previous attempt is not classified as keep,
  quarantine, or revert before broadening scope.

## 8. V2 Scorecard Impact

V2 SCORECARD IMPACT

Quality dimension advanced:

- V2-Q3 Evidence extraction: preserves the proven EvidenceItem handoff as the
  next downstream input.
- V2-Q5 Verdict quality: creates the path to reviewed verdict/report candidates
  without claiming public quality now.
- V2-Q6 Warning integrity: requires warning materiality before report exposure.
- V2-Q7 Multilingual robustness: requires exact Captain-approved multilingual
  inputs and preservation of original language through internal contracts.
- V2-Q8 Public cutover safety: keeps public fail-closed behavior mandatory.
- V2-Q10 Complexity convergence: blocks hidden-only bloat and requires
  retirement/merge triggers.

Direct user/report value:

- none immediately. The next allowed implementation target is internal report
  value, not public display.

Hidden-only value:

- acceptable only when it directly bridges W5-F to internal Alpha `ReportResult`
  or retires/merges older W4/W5 proof machinery.

Cost/latency impact:

- no new live jobs or expensive runs authorized by this plan. Future prompt or
  model changes require separate approval.

Retirement or simplification unlocked:

- required decision on W4-I core/sink lineage debt after W6-B/W6-C: merge,
  narrow, keep with trigger, or quarantine.
- possible consolidation of W4-G/W4-H/W5 route projections once the canonical
  report path owns the evidence chain.

Scorecard risk:

- Alpha candidate may be mistaken for report readiness. The plan therefore
  requires a positive stop before report-review/cutover.

## 9. V2 Retirement Ledger Impact

V2 RETIREMENT LEDGER IMPACT

Rows touched:

- V2-RL-001: still blocked; no V1 cleanup before V2 public equivalence.
- V2-RL-003: keep public cutover guard.
- V2-RL-004: hidden observability route family must merge/reduce as report
  owner stabilizes.
- V2-RL-009: W4 readiness/shell/denial chain remains merge-only, not expandable.
- V2-RL-010 and V2-RL-011: W4-G/W4-H remain parent lineage for W5 and future
  sufficiency/report owner.
- V2-RL-012: W4-I standalone route retired; core/sink retained only as temporary
  lineage debt.
- V2-RL-013: boundary guard split becomes a mandatory checkpoint after W8-A.
- V2-RL-014: WIP/handoff volume should be consolidated after this stop-line
  plan is accepted.

Status changes:

- none in this plan.

New mechanism owner:

- none authorized by this plan. Future implementation packages must name the
  concrete owner for any sufficiency/report candidate mechanism before code
  work starts.

Removal / merge trigger:

- W6-B/W6-C must decide whether W4-I core/sink state is merged, narrowed, kept
  with sharper removal trigger, or quarantined.

Debt accepted:

- short-term continuation of W4-G/W4-H/W5 lineage artifacts and W4-I core/sink
  state until a downstream sufficiency/report owner exists.

## 10. Review Record

First stop-decision review:

- Lead Architect reviewer: consent to pause now; resume only toward internal
  direct-text Alpha `ReportResult` candidate.
- Complexity/Retirement reviewer: consent; Alpha must not become another hidden
  proof lane and every new mechanism needs retirement impact.
- Lead Developer/Architecture reviewer: consent; pause source/runtime work but
  allow architecture/package work.
- LLM/Prompt Governance reviewer: consent; no prompt/model/config/schema or
  semantic behavior without approval.
- Evidence Provenance reviewer: consent; sufficiency must own independence,
  language, temporal, scarcity, and source-reliability boundaries.
- Product Trust reviewer: consent; Alpha is not report-ready until comparator
  and report-quality review.

Second plan review:

- Lead Architect reviewer: consent after required edits on exact owner naming,
  UCM/prompt governance, no-live validation, fixture-only risk, and comparator
  availability.
- Complexity/Retirement reviewer: consent after required edits on sufficiency
  ownership, route defaults, adapter creep, and debt-sensor checkpoints.
- LLM/Prompt Governance reviewer: consent after required edits on task gates,
  multilingual exact-input handling, cache/no-store governance, and semantic
  label ownership.
- Evidence Provenance reviewer: consent after required edits on narrow direct
  path wording, provenance metadata, independent origin count, language justice,
  temporal fields, and scarcity versus provider narrowness.
- Product Trust reviewer: consent after required edits on exact Captain input,
  citation rules, normative contract fields, reportQualityStatus, and warning
  materiality verifier.
