# V2 Slice W8-C Post-W8B Convergence Review Package

**Status:** Steer-Co review package; no implementation until accepted
**Date:** 2026-05-20
**Author:** Captain Deputy / Steer-Co
**Proposed implementer:** Lead Developer after package acceptance
**Package type:** convergence and retirement package, not a live-job package

## 1. Decision

Recommended next package: implement W8-C as a no-live convergence slice after W8-B.

W8-B is committed at `f468a73d` and verifier-clean as the first hidden/internal
Alpha report-result candidate plus bounded hidden/admin-only report-chain
artifact over runtime-owned W7-B2 output.

The immediate next step should not add another hidden mechanism. It should
reduce or merge temporary scaffolding that W8-B made reviewable:

- cover W8-A fail-closed parity against W8-B;
- mark the W8-A merge trigger as parity-covered when tests prove it;
- re-raise and decide the W7-A merge/quarantine path;
- begin boundary-guard consolidation for the W7/W8 report-result path.

A W8-B product-route canary remains the immediately sequenced successor after
W8-C lands or is explicitly rejected. Because the live-job ledger currently
records `currentRemaining = 0`, that canary package must include a separate
tranche top-up/reset and one-job accounting before any live submission.

## 2. Steer-Co Outcome

Steer-Co reviewed the next-step choice after W8-B commit `f468a73d`.

**Gemini reviewer:** recommended an immediate W8-B canary because report-value
evidence should be proven with real runtime data before structural cleanup.
Gemini also stated Captain escalation is needed for a live-job ledger update.

**Claude Opus 4.6 reviewer:** recommended convergence first. Rationale:
the live-job tranche is exhausted, W8-B explicitly carried W8-A and W7-A
merge triggers, and V2-Q10 / retirement-ledger pressure requires acting on the
deferred convergence item before adding or spending another hidden-live package.

**Captain Deputy consolidation:** choose W8-C convergence first, then the W8-B
canary package. This preserves report-value momentum without ignoring the
mechanism debt W8-B intentionally exposed. The later canary should run on the
converged code path and must include an explicit ledger top-up/reset.

No unresolved material dissent remains for preparing this review package. A
future W8-B canary still needs its own reviewed package, runtime refresh,
ledger accounting, and route preflight.

## 3. What W8-C Unlocks

W8-C unlocks a cleaner report-value path for the next canary:

```text
W7-A contract bridge
  -> W8-A stop candidate
  -> W7-B2 runtime-owned boundary/verdict execution
  -> W8-B internal Alpha report-result candidate
  -> W8-C convergence: merge/retire scaffolding proven redundant
```

W8-C does not unlock public behavior, report publication, or live execution by
itself. It unlocks a more diagnostic W8-B canary by reducing temporary W7/W8
scaffolding and documenting what remains load-bearing.

## 4. Scope

Allowed implementation files after acceptance:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/report-result/report-stop-candidate.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result.ts`
- focused tests under `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- optional focused guard helper/test file if it reduces the boundary-guard
  monolith without weakening existing coverage
- `Docs/AGENTS/V2_Retirement_Ledger.md`
- `Docs/AGENTS/V2_Excellence_Scorecard.md` only if wording is needed for this
  convergence decision
- status, backlog, handoff, Agent_Outputs, and generated index updates.

Allowed behavior:

- add W8-A fail-closed parity tests that compare W8-A and W8-B behavior for
  missing, blocked, damaged, non-runtime-owned, public-open, side-effect-open,
  or lineage-mismatched parents;
- mark W8-B's `w8aMergeTrigger.status` as `parity_covered` only when those
  tests pass;
- reduce W8-A to a documented fail-closed compatibility helper if W8-B covers
  accepted W7-B2 output and blocked/damaged parity;
- evaluate W7-A's remaining load-bearing role after W7-B/W7-B2/W8-B and either:
  - keep only explicit validation still needed by W7-B/W8-B;
  - merge validation into W7-B/W8-B input checks; or
  - quarantine W7-A as historical contract scaffolding;
- extract or narrow W8-B/W7 report-result boundary-guard assertions if this
  reduces monolith size without reducing coverage.

Forbidden behavior:

- no live job or canary;
- no live-job ledger top-up/reset in this package;
- no prompt/model/config/schema/UCM/gateway edit or approval flip;
- no new LLM call, provider call site, provider seam, or Anthropic SDK import;
- no public/API/UI/report/export/compatibility behavior;
- no generated public report prose;
- no public truth percentage, confidence, user-visible warning, verdict, or
  report result;
- no source acquisition, parser execution, cache IO, Source Reliability,
  durable storage, provider expansion, retries, W2/W3 widening, ACS/direct URL,
  V1 work, V1 cleanup, or cutover;
- no direct W4-I import/read/call/sink access;
- no raw source text, EvidenceItem statements, snippets, summaries, input packet
  text, prompt text, rendered prompt text, provider payloads, hidden ledger ids,
  or internal statuses in public/default-admin/log/error surfaces.

## 5. Pass Criteria

W8-C passes when all are true:

- W8-A fail-closed parity coverage exists for W8-B accepted and rejected parent
  states.
- W8-B accepted path still creates exactly one internal Alpha report-result
  candidate for accepted runtime-owned W7-B2 output.
- W8-B rejected paths remain blocked/damaged and do not create public/default
  report output.
- W8-A merge trigger is updated only if parity tests prove it.
- W7-A status is explicitly decided as keep, merge, or quarantine with a
  reason and next trigger.
- Boundary-guard changes are coverage-preserving and net smaller or more
  focused; if no safe split is possible, the package records why and does not
  force a speculative rewrite.
- `Docs/AGENTS/V2_Retirement_Ledger.md` is updated for W7-A, W8-A, and
  boundary-guard pressure.
- Public V2 remains `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged`.

## 6. Stop Criteria

Stop and reconvene Steer-Co if:

- W8-A parity cannot be proven without widening W8-B output or weakening
  redaction;
- W7-A is still required in a way that conflicts with W7-B/W8-B ownership;
- boundary-guard extraction expands scope or loses coverage;
- implementation needs any prompt/model/config/schema/UCM/gateway edit;
- implementation needs a live job, public behavior, Source Reliability,
  parser/cache/storage/provider widening, ACS/direct URL, or V1 cleanup;
- a focused verifier fails twice without clear root cause;
- debt-sensor output worsens materially without a removal/merge trigger.

## 7. Verifier Plan

Required after implementation:

```powershell
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

If boundary-guard splitting creates a new focused test file, include it in the
focused verifier set.

## 8. V2 SCORECARD IMPACT

Quality dimension advanced:

- `V2-Q5`: keeps the first internal Alpha report-result path focused on
  inspectable boundary/verdict output instead of accumulating preparatory
  scaffolding.
- `V2-Q8`: preserves public cutover safety.
- `V2-Q10`: directly acts on the convergence pressure created by W8-B.

Direct user/report value:

- Indirect. W8-C improves the integrity and maintainability of the internal
  report-value path before spending a live job on it.

Hidden-only value:

- Convergence only. It is justified because it retires, merges, or explicitly
  preserves older hidden machinery.

Cost/latency impact:

- No live-job spend. No new provider call. Later canary should be cleaner and
  more diagnostic.

Retirement or simplification unlocked:

- W8-A merge/reduction after parity coverage.
- W7-A merge/quarantine decision.
- First boundary-guard report-result extraction or documented no-split decision.

Scorecard risk:

- Over-cleaning before live proof could remove useful diagnostics. Mitigation:
  keep changes bounded, verifier-backed, and reversible; do not delete W8-A or
  W7-A behavior unless parity and ownership are clear.

## 9. V2 RETIREMENT LEDGER IMPACT

Rows touched:

- W8-A temporary report stop owner: merge/reduce after parity coverage.
- W7-A contract boundary/verdict bridge: decide keep/merge/quarantine.
- V2-RL-013 boundary guard monolith: begin focused report-result extraction or
  record no-safe-split rationale.

Status changes:

- Proposed only; implementation must update the ledger with actual result.

New mechanism owner:

- None intended. W8-C should reduce or clarify mechanisms, not add one.

Removal / merge trigger:

- W8-A: W8-B fail-closed parity covered.
- W7-A: W7-B/W7-B2/W8-B own the accepted path and parent validation can be
  merged without weakening fail-closed behavior.
- Boundary guard: focused tests preserve all current W7/W8 guard assertions.

Debt accepted:

- No new hidden route/sink/artifact debt is accepted by this package.

## 10. V2 CONSOLIDATION GATE

Gate result: pass if implemented as scoped.

W8-C is a convergence package, not hidden readiness expansion. It is allowed
because it is explicitly designed to reduce or merge older scaffolding before
the next report-value canary.

## 11. Latest Debt Sensor Status

`npm run debt:sensors` on 2026-05-20T20:57:31Z returned `advisory_warn`:

- V2 source: `158` files / `48683` lines.
- V2 tests: `139` files / `53667` lines.
- Boundary guard: `11597` lines.
- Docs/WIP markdown files: `241`.
- Handoff markdown files: `762`.
- Net mechanism increases: `18`.
- Consolidation-marker review files: `5`.

These warnings do not block W8-C, but they are the reason convergence is the
recommended next package before a new live-job tranche.

## 12. Next Package After W8-C

If W8-C lands cleanly, prepare a W8-B/W8-C product-route canary package.

That later package should:

- include a Steer-Co or Captain-approved one-job tranche top-up/reset;
- use exactly one Captain-defined input;
- refresh runtime from the accepted implementation commit;
- preflight the W8-B artifact route auth/no-store/default-redaction behavior;
- require W8-B candidate creation, W7-B2 lineage, no public leak, and public
  V2 still blocked/precutover/report_damaged;
- debit the ledger by exactly one if the canary is submitted;
- authorize no second canary without a separate reviewed package.
