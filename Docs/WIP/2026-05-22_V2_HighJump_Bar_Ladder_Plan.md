# V2 HighJump Bar Ladder Plan

**Date:** 2026-05-22
**Status:** Active core-plan addendum for the next V2 phase
**Owner:** Captain Deputy / Lead Developer
**Scope:** V2 direct-text internal Alpha path only

## Decision

Captain changed the near-term V2 strategy:

- Lower the blocking bars enough to produce the first internal V2 report result.
- After a successful report result exists, raise the bars step by step where the
  report evidence shows a higher bar is actually needed.
- Use the HighJump pattern as a controlled method: remove premature blockers,
  keep containment, generate evidence, then tighten based on the generated
  report and hidden chain artifacts.

This plan supersedes the previous "pause/no live jobs/no prompt edits" stop-line
for the current V2 workstream. It does not authorize public cutover.

## Current Evidence

Recent HighJump evidence:

- Source state before this plan: `fc5e7f8e`.
- Takeover/provenance checkpoint: `b2fd7b3f`.
- Prompt recalibration: `0c44d391`.
- W4A/W4C duplicate text-hash dedup: `ed639a1a`.
- W4G/corpus-shell duplicate text-hash dedup: `fc5e7f8e`.
- Validated canary: `099eb05cbbca408a87f7168327926762`.
- Incomplete canary: `68a4fa4fa99f48c18679e9b68e3ff344`.

The validated canary proves that a lowered W6-C path can move from
`refine_retrieval` to `caveat_report` and reach W7-A
`boundary_verdict_candidate_ready`. It does not prove public report quality and
does not validate the incomplete second canary.

## New Authority

Captain-authorized for this phase:

- Prompt edits: allowed when topic-neutral, UCM/file-prompt compliant, and
  verifier-backed.
- Live jobs: maximum `12` in the new tranche, tracked in
  `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`.

Still approval-gated unless explicitly included in a reviewed package:

- model/config/schema/UCM/gateway-policy changes beyond prompt text;
- public API/UI/report/export/compatibility projection;
- cache/Source Reliability/storage behavior;
- parser execution, ACS/direct URL widening, provider expansion outside the
  active package;
- V1 reuse, V1 cleanup, or V1 removal.

## Operating Principle

Lowering a bar is acceptable only when it changes a premature stop into one of:

- an internal Alpha report result;
- an internal caveated report result;
- a structured stop with enough evidence to decide the next repair.

Lowering a bar is not acceptable when it:

- hides a real data leak, schema corruption, provenance break, or public-surface
  failure;
- replaces missing evidence with invented certainty;
- removes EvidenceItem citation requirements;
- makes public V2 look report-ready;
- adds permanent machinery without a retirement or merge trigger.

## Phase HJ-0: Stabilize Starting Point

Goal: ensure the team works from a clean, committed, current runtime state.

Required before code or prompt edits:

1. Confirm clean git status.
2. Confirm current plan and ledger point to this HighJump plan.
3. Run `npm run debt:sensors` and record salient warnings.
4. Select the exact Captain-defined input for the first report attempt.
5. Identify the current report-blocking stop from hidden artifacts, not from
   assumptions.

Preferred first input:

```text
Using hydrogen for cars is more efficient than using electricity
```

Rationale: this is the already validated HighJump claim family, false-side
expected direction, and current artifacts show W6/W7 movement.

## Phase HJ-1: Lower Only Report-Blocking Bars

Goal: get one internal Alpha report result without weakening containment.

Candidate lowering actions, in priority order:

1. Prompt-only recalibration where an LLM stop is too conservative for internal
   Alpha reporting:
   - allow `caveat_report` when probative EvidenceItems exist but the evidence
     portfolio is incomplete;
   - keep `refine_retrieval` for cases where available evidence is not enough
     to support any useful caveated result;
   - keep `damage_report` for schema/runtime integrity failures.
2. Convert duplicate or derivative evidence from whole-run blockers into
   deduplication plus caveat when provenance remains valid.
3. Allow internal Alpha report generation from caveated sufficiency only when
   all public surfaces remain blocked/precutover and hidden artifacts remain
   redacted by default.
4. If W7/W8 remains closed only because an internal execution flag or task gate
   is still blocked, prepare the narrowest package for that exact gate. Do not
   silently flip model/config/gateway policy under this plan.

Forbidden lowering:

- no public report projection;
- no EvidenceItem-less verdict;
- no source-text leak into default admin/public/log/error surfaces;
- no deterministic semantic text-analysis logic;
- no fixed truth/confidence/sufficiency formula;
- no topic-specific prompt examples or canary-domain wording.

## Phase HJ-2: First Internal Report Attempt

Goal: spend live jobs only after local verifiers pass and runtime is refreshed.

Process:

1. Commit prompt/source changes before submission.
2. Refresh runtime and verify runtime commit hash.
3. Run route/runtime preflight for authenticated internal artifacts and public
   pre-cutover containment.
4. Submit exactly one canary.
5. Fetch hidden artifacts immediately because V2 internal artifacts are
   process-local.
6. Record job id, runtime commit, hidden chain, public leak check, token/cost
   telemetry, and exact stop/result classification.

Pass signal:

- hidden chain reaches an internal Alpha report result or caveated internal
  report result;
- report candidate cites EvidenceItem ids or explicitly marks limitation
  statements;
- public V2 remains `4.0.0-cb-precutover`, `blocked_precutover`,
  `report_damaged`;
- default admin routes remain hash/length/provenance-only unless an explicit
  inspection flag is used;
- no source text, EvidenceItem text, snippets, summaries, prompt text, provider
  payloads, hidden ledger ids, or internal statuses leak publicly.

Stop signals:

- no hidden report artifact after two consecutive committed/runtime-clean
  attempts;
- schema/runtime failure with unclear cause;
- public/default-admin/log/error leak;
- W7/W8 needs non-prompt model/config/schema/gateway changes not explicitly
  packaged;
- total spent jobs reaches `6` without a successful internal report result.

## Phase HJ-3: Report Review Before Raising Bars

After the first successful internal report result:

1. Do not immediately publicize it.
2. Run report review against:
   - `Docs/AGENTS/Captain_Quality_Expectations.md`;
   - `Docs/AGENTS/benchmark-expectations.json`;
   - `Docs/AGENTS/report-quality-expectations.json`;
   - exact/family comparator reports when available.
3. Classify the result:
   - `alpha_report_value_present`: useful but not public-ready;
   - `alpha_report_misleading`: report generated but top-line/citations/caveats
     are materially wrong;
   - `alpha_report_structurally_damaged`: report generated but provenance,
     schema, leak, or warning integrity failed.
4. List every lowered bar that was actually used.
5. Raise only the bars whose looseness caused a concrete quality, trust, cost,
   or maintainability defect.

## Phase HJ-4: Raise Bars Step By Step

Bar raising order:

1. **Containment bars first.**
   Fix any public/default-admin/log/error leak before further quality work.
2. **Schema and provenance bars.**
   Re-tighten schema, lineage, hash/length, and EvidenceItem citation
   requirements where the report result shows ambiguity or drift.
3. **Sufficiency bars.**
   Convert broad `caveat_report` allowance into narrower LLM-owned criteria:
   caveated reports may proceed only when the report states what evidence is
   missing and how that affects confidence.
4. **Verdict/report bars.**
   Require every factual or normative-supporting narrative claim to cite
   EvidenceItem ids or be explicitly labeled synthesis/limitation.
5. **Warning bars.**
   User-visible warnings must reflect verdict impact; internal diagnostics stay
   admin-only.
6. **Cost/latency bars.**
   Once quality is visible, tighten token budgets, retry policy, and model use
   without lowering report quality.
7. **Public-readiness bars.**
   Only after multiple reviewed internal reports pass should a separate cutover
   package consider public projection.

Each bar-raise change needs:

- named defect or quality gap;
- expected report-quality improvement;
- local verifier;
- one canary only when local evidence cannot answer the question;
- retirement/merge impact for any temporary HighJump mechanism.

## Live-Job Budget Plan

New tranche: `12`.

Planned allocation:

| Reserve | Jobs | Use |
|---|---:|---|
| First report path | 3 | First internal report attempt and up to two narrowly justified repair attempts |
| Stability check | 2 | Repeat same input after first pass to distinguish success from lucky run |
| Breadth check | 3 | Up to three other Captain-defined inputs after first report exists |
| Bar-raising validation | 2 | Verify tightened bars preserve report generation |
| Operational reserve | 2 | Capture mistakes, runtime mismatch, or one Steering-approved tie-breaker |

Budget discipline:

- no speculative canary;
- no second canary for the same package unless the result creates a specific
  ambiguity that local verifiers cannot resolve;
- wrong-variant, stale-runtime, or capture-error jobs still consume budget;
- update the live-job ledger immediately after every submission/result.

## Prompt Edit Rules

Prompt edits are allowed in this phase, but must be:

- topic-neutral and multilingual-safe;
- abstract rather than canary-specific;
- limited to the smallest prompt section that owns the observed stop;
- backed by prompt-contract tests where local tests exist;
- reviewed by at least one LLM-quality reviewer when the edit changes analytical
  behavior materially.

Prompt edits must not:

- include concrete canary terms like hydrogen, Bolsonaro, asylum, or plastic;
- change schema literals without a schema/package decision;
- teach to a benchmark input;
- hide uncertainty or missing evidence;
- instruct the model to generate a public-ready report.

## V2 Scorecard Impact

V2 SCORECARD IMPACT

Quality dimension advanced:

- V2-Q3 Evidence extraction: uses actual EvidenceItems as the report substrate.
- V2-Q5 Verdict quality: moves from hidden stops to reviewable internal report
  candidates.
- V2-Q6 Warning integrity: keeps caveats and warnings tied to report impact.
- V2-Q8 Public cutover safety: keeps public V2 fail-closed while internal
  quality is developed.
- V2-Q9 Cost/latency discipline: caps live jobs and records telemetry.
- V2-Q10 Complexity convergence: requires post-success bar raising and
  retirement/merge decisions.

Direct user/report value:

- first internal report result suitable for quality review, not public display.

Hidden-only value:

- acceptable only until the report result and review identify which bars to
  raise or which temporary mechanisms to retire.

Cost/latency impact:

- bounded by a 12-job tranche and local verifiers before every canary.

Retirement or simplification unlocked:

- once a report result exists, earlier denial/observability layers can be
  evaluated for merge/quarantine rather than extended blindly.

Scorecard risk:

- the team may mistake "report generated" for "report good." This plan blocks
  that by requiring report review and staged bar raising before any public path.

## V2 Retirement Ledger Impact

V2 RETIREMENT LEDGER IMPACT

Rows touched:

- V2-RL-001: V1 cleanup remains blocked until V2 public equivalence exists.
- V2-RL-003: public cutover guard remains mandatory.
- V2-RL-004: hidden artifact routes remain temporary; merge/reduce after report
  owner stabilizes.
- V2-RL-009 through V2-RL-012: W4/W5 proof-chain pieces should be assessed for
  merge/quarantine after the first internal report result.
- V2-RL-019: OpenAlex/source-diversity path remains evidence context, not the
  next default expansion target.
- V2-RL-020: prior diagnostic projection retirement remains accepted.

Status changes:

- none directly in this plan.

New mechanism owner:

- none authorized by this plan itself.

Removal / merge trigger:

- first successful internal report result starts a mandatory review of which
  HighJump loosenings and older proof-chain routes are still load-bearing.

Debt accepted:

- temporary prompt loosenings and gate loosenings may exist only until the first
  report-review cycle identifies what to tighten or retire.

## Stop / Escalation Triggers

Stop and use Steer-Co or Captain approval if:

- public V2 changes from blocked/precutover/report_damaged;
- source text or EvidenceItem text leaks into public/default-admin/log/error
  surfaces;
- model/config/schema/UCM/gateway changes are required beyond prompt text;
- more than `6` jobs are spent without an internal report result;
- a generated report is materially misleading and the fix path is not obvious;
- two prompt edits fail to move the same stop;
- implementation adds new hidden routes, diagnostics, or proof layers without a
  retirement/merge trigger;
- V1 cleanup or public cutover is proposed.

## Immediate Lead Developer Direction

Prepare a narrow implementation package for the first HighJump report attempt:

- target the current active blocker after `fc5e7f8e`;
- prefer prompt-only or existing-gate activation repair over new mechanisms;
- keep public V2 blocked;
- run focused local verifiers and build before any canary;
- spend at most one canary for the first attempt after commit/runtime refresh;
- return the hidden report result or the exact stop with artifact evidence.
