# V2 Slice W6-C5 Sufficiency Decision Gate And Diagnostic Retirement Package

**Status:** Steer-Co consented; implementation authorized under Captain-delegated prompt/schema authority
**Date:** 2026-05-21
**Owner:** Captain Deputy / Steer-Co
**Implementer:** Lead Developer
**Reviewers:** Claude Opus 4.6 senior architect/LLM expert; Product/Report-Quality reviewer
**Source evidence:** W6-C4 canary job `cbb4f6b5ae9d49a3bb6f941c7ae6c231`

## Decision

W6-C4 fixed the W6-C schema contract failure. The current stop-line is now a
valid accepted W6-C result with `reportStopRecommendation = refine_retrieval`
and one admitted EvidenceItem. Steer-Co consent is to implement W6-C5 as a
decision gate, not a W7 bypass.

W6-C5 may:

- clarify the W6-C sufficiency prompt so the LLM distinguishes visibility and
  use of internal Alpha candidate review from public-report publication;
- keep the same analytical sufficiency standard for internal and public routes;
- preserve `refine_retrieval` when additional retrieval is materially needed
  before fair boundary/verdict candidate formation;
- preserve `damage_report` fail-closed behavior;
- fold temporary W6-C3 schema-diagnostic scaffolding into stable W6-C telemetry.

W6-C5 must not:

- relax W7-A or W7-B gates;
- force `continue_to_boundary_formation`;
- lower evidence standards for internal Alpha;
- add retrieval logic;
- change model/config/UCM/gateway policy;
- change public V2 behavior.

## Steer-Co Consolidation

Initial reviewer positions differed:

- Product/Report-Quality reviewer preferred retrieval refinement first because
  one EvidenceItem can legitimately justify `refine_retrieval`.
- Claude Opus preferred W6-C prompt-contract sharpening plus W6-C3 diagnostic
  retirement because the current prompt may conflate public report readiness
  with internal candidate exploration.

Consolidated consent:

- implement one bounded W6-C5 prompt clarification and diagnostic fold-in;
- use the same Captain input as W6-C4 for an apples-to-apples canary;
- treat the canary as a decision gate only;
- if W6-C5 still returns `refine_retrieval` or `damage_report`, stop and pivot
  to retrieval refinement;
- if W6-C5 returns `caveat_report` or `continue_to_boundary_formation`, record
  the result but require a separate W7 package before W7 execution claims.

## Exact Boundaries

Allowed files:

- `apps/web/prompts/claimboundary-v2.prompt.md`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment.ts`
- focused W6-C/W8-B/prompt-contract tests
- status, backlog, handoff, Agent_Outputs, generated index, and this package

Forbidden:

- W7-A/W7-B gate relaxation;
- `candidatePopulation` edits;
- `sufficiencyStopReason` edits;
- source acquisition or retrieval implementation;
- EvidenceItem, parser, report, verdict, warning, confidence, cache, SR, storage,
  provider expansion, ACS/direct URL, public/API/UI/export/compatibility, V1
  work, or V1 cleanup.

## Prompt Diff Intent

The prompt diff must be a clarification only. It may state:

- internal Alpha visibility does not lower the sufficiency bar;
- `continue_to_boundary_formation` is appropriate only when current evidence is
  sufficient for boundary/verdict candidate review;
- `caveat_report` is appropriate when a candidate can be formed but scarcity or
  caveats must remain explicit;
- `refine_retrieval` remains the correct choice when material missing dimensions
  mean more retrieval is needed before fair boundary/verdict candidate formation.

It must not include Captain canary terms or examples.

## Canary Decision Table

| W6-C5 result | Action |
|---|---|
| `refine_retrieval` | Stop. Pivot to retrieval refinement. No W6-C6 prompt retries. |
| `damage_report` | Stop. Pivot to retrieval refinement or source/evidence diagnosis. |
| `caveat_report` | Record result. W7 remains separately reviewed; no auto-advance. |
| `continue_to_boundary_formation` | Record result. W7 remains separately reviewed; no auto-advance. |

## V2 SCORECARD IMPACT

Quality dimension advanced:

- V2-Q5/V2-Q6 indirectly: clarifies whether sufficiency is stopping for a real
  evidence reason or because the prompt over-constrains the decision.
- V2-Q10 directly: retires temporary diagnostic scaffolding instead of adding a
  new hidden mechanism.

Direct user/report value:

- None public yet.

Hidden-only value:

- Acceptable because it is a decision gate and debt reduction, not another
  readiness/proof layer.

Cost/latency impact:

- One later canary is proposed after commit/runtime refresh; no added runtime
  calls in local implementation.

Retirement or simplification unlocked:

- W6-C3 temporary diagnostic version/removal-trigger scaffolding folds into
  stable W6-C schema failure telemetry.

Scorecard risk:

- If the prompt softens sufficiency standards, weak evidence could be laundered
  into W7. Guardrail: reviewers require explicit "does not lower the
  sufficiency bar" posture and W7 gates remain unchanged.

## V2 RETIREMENT LEDGER IMPACT

Rows touched:

- New W6-C3 diagnostic fold-in row to be recorded in the retirement ledger.

Status changes:

- W6-C3 schema-diagnostic scaffolding moves from temporary diagnostic to folded
  stable W6-C telemetry.

New mechanism owner:

- None.

Removal / merge trigger:

- W6-C4 canary `cbb4f6b5ae9d49a3bb6f941c7ae6c231` satisfied the W6-C3 trigger:
  schema root cause resolved and Captain-approved canary verified W6-C
  completion with `schemaDiagnostics = null`.

Debt accepted:

- None intended.

## V2 CONSOLIDATION GATE

W6-C5 passes only if net mechanism count decreases or stays flat. It must amend
the existing W6-C prompt/telemetry; it must not add a new diagnostic, readiness,
denial, proof, route, or parallel sufficiency path.

BALANCED RISK MITIGATION
Named risk: W6-C may be over-stopping at `refine_retrieval` because the prompt
does not clearly separate internal candidate review from public report
publication, while a real evidence-scarcity stop must remain respected.
Decision result: amend existing W6-C prompt and delete/fold temporary W6-C3
diagnostic scaffolding.
Rejected alternatives: relax W7 gates; implement retrieval before checking the
contract ambiguity; add another diagnostic layer; retire diagnostics only.
Owner: Lead Developer under Captain Deputy.
Verifier: focused W6-C tests, prompt-contract tests, W8-B projection tests,
boundary guard, gate validation, build, debt sensors, later one canary.
Net-complexity impact: decreases temporary W6-C3 scaffolding; no new runtime
mechanism.
Residual risk: the canary may still correctly return `refine_retrieval`.
Removal / merge trigger: if W6-C5 canary still returns `refine_retrieval`, stop
and pivot to retrieval refinement.

## Latest Debt Sensor Status

`npm run debt:sensors` on 2026-05-21T02:37:57.908Z returned
`advisory_warn`:

- V2 source: `158` files / `49059` lines.
- V2 tests: `139` files / `54189` lines.
- Boundary guard: `11598` lines.
- Docs/WIP markdown files: `251`.
- Handoff markdown files: `776`.
- Net mechanism increases: `18`.
- V2 consolidation-marker warnings: `5`.

## Verifier Plan

Implementation verifiers:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run debt:sensors
npm -w apps/web run build
npm run index
git diff --check
git status --short --untracked-files=all
```

One later canary is worth spending after clean commit/runtime refresh, using
the same Captain input as W6-C4:

`Using hydrogen for cars is more efficient than using electricity`

No canary is authorized before implementation is committed and runtime is
refreshed.
