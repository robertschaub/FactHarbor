---
roles: [Senior Developer, LLM Expert]
topics: [235000_comparison, live_validation, progress_heartbeat, verdict_grounding, prompt_contract]
files_touched:
  - apps/web/src/lib/analyzer/research-orchestrator.ts
  - apps/web/test/unit/lib/analyzer/research-orchestrator-progress.test.ts
  - apps/web/prompts/claimboundary.prompt.md
  - apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts
---

# 2026-04-27 | Senior Developer / LLM Expert | Codex (GPT-5) | 235000 Stabilization, Heartbeat, And Grounding

## Summary

Continued the `235000 Flüchtlinge...` comparison investigation after the primary `UNVERIFIED` regression had been repaired. Two additional meaningful fixes were committed on `main`:

- `6b1507e7 fix(research): emit stage two heartbeat events`
- `c1513ac8 fix(prompt): avoid grounding completeness false positives`

The exact Captain-approved input was live-validated once after these commits:

`235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.`

Live job:

- `ecd2f2be10144e058120c467341b21c4`
- Status: `SUCCEEDED`
- Progress: `100`
- Verdict: `LEANING-FALSE`
- Truth / confidence: `30 / 60`
- Prompt hash: `0a255030bbd19fb71654c94565319d33615b3398ab4a12714294988b0c6ba256`
- Runtime commit provenance: `c1513ac8...+40da2e4a` (dirty suffix from unrelated pre-existing docs/index changes)

## Fix 1: Stage 2 Heartbeat Visibility

Problem:

- Live jobs showed long progress plateaus during Stage 2.
- Existing polling and backend monotonic progress were already fixed, but `runResearchIteration()` had sparse substep events.

Change:

- Added existing-channel `state.onEvent(..., -1)` heartbeats before and after long Stage 2 research substeps:
  - research query generation,
  - source search,
  - relevance classification,
  - source fetch,
  - evidence extraction,
  - admitted evidence summary,
  - direct-source refinement,
  - supplementary English lane equivalents.
- Added `research-orchestrator-progress.test.ts` to verify these events are emitted without changing progress.

Verification:

- `npm -w apps/web run test -- test/unit/lib/analyzer/research-orchestrator.test.ts test/unit/lib/analyzer/research-orchestrator-progress.test.ts`
- `npm -w apps/web run build`
- Live job `ecd2f2be...` emitted 60+ Stage 2 heartbeat events, including main, contradiction, and refinement lanes.

Residual:

- Plateaus can still occur during single long LLM calls, especially clustering and verdict reconciliation. The live job showed a roughly two-minute 60% clustering call. This is a separate heartbeat/long-call visibility problem, not a Stage 2 substep visibility problem.

## Fix 2: Grounding Completeness False Positives

Problem:

- A current successful job still emitted an info-level `verdict_grounding_issue` because a false/low-truth verdict had an empty `supportingEvidenceIds` array while reasoning discussed claim-local material.
- The grounding prompt already allowed claim-local contextual references, but did not explicitly prohibit empty-citation-side completeness complaints.

Change:

- Amended `VERDICT_GROUNDING_VALIDATION` to state that empty `supportingEvidenceIds` or `contradictingEvidenceIds` are not grounding failures by themselves.
- Added prompt-contract coverage in `verdict-prompt-contract.test.ts`.

Verification:

- `npm -w apps/web run test -- test/unit/lib/analyzer/verdict-prompt-contract.test.ts`
- `npm -w apps/web run build`
- Build reseeded `claimboundary` prompt hash to `0a255030bbd1...`.
- Services were restarted after code/prompt changes and health-checked.
- Live job `ecd2f2be...` produced no `verdict_grounding_issue`.

## Live Validation Findings

Positive:

- No `UNVERIFIED`.
- No `report_damaged`.
- No eventstream warnings/errors.
- Progress finished at `100`.
- AC_02 preserved `freshnessRequirement: current_snapshot`.
- AC_02 had current-side route metadata including SEM current statistics.
- AC_02 evidence pool had 19 items: 2 `supports`, 4 `contradicts`, 13 `neutral`.
- Current-side SEM 2025 evidence was present as direct support for AC_02.

Warnings in result JSON were info-level only:

- `source_fetch_failure` x4
- `source_fetch_degradation` x1
- `evidence_partition_stats` x1
- `direction_rescue_plausible` x1

Residual quality notes:

- AC_02 verdict still omitted `supportingEvidenceIds` despite current-side support evidence existing in the claim-local pool. This did not trigger grounding warnings after the prompt fix, but citation completeness for comparison side-premise support remains imperfect.
- The live run did not find/use the earlier 115,000 endpoint stock as the decisive contradiction; instead it contradicted via UEK cumulative-period evidence and the lack of a direct endpoint stock in that source. Prior validated runs did find endpoint-side contradictions. Treat this as remaining live variance, not a new deterministic-code target.
- `direction_rescue_plausible` still appears and should be watched, but it did not cause downgrade or user-facing failure in this run.

## Runtime / Service State

- Prompt reseeded after prompt change; active hash changed to `0a255030bbd1...`.
- Services restarted after code/prompt changes.
- Old duplicate local service shells were cleaned up; final service shell count for repo service wrappers was `0`.
- Final active listeners were one API process and one Web node process.
- Health checks passed for:
  - `http://localhost:5000/health`
  - `http://localhost:3000/api/fh/health`
  - `http://localhost:3000/api/fh/version`

## Live Job Budget

The final available autonomous live slot was used for `ecd2f2be...`.

Do not submit further live jobs without Captain confirmation unless the budget is explicitly reset.

## DEBT-GUARD RESULT

Classification:
- Heartbeats: `incomplete-existing-mechanism`.
- Grounding prompt: `incomplete-existing-mechanism`.

Chosen option:
- Amend existing event channel and existing grounding prompt contract.

Rejected path and why:
- Did not change polling/progress math because monotonic polling was already fixed and changing percentages would be broader.
- Did not add deterministic issue-string filtering because that would be language/string-dependent and could hide real grounding failures.
- Did not add semantic code repair for evidence direction or verdict citations.

What was removed/simplified:
- No production code removed.
- Duplicate/stale local service shells were cleaned up operationally, not committed as code.

What was added:
- Stage 2 heartbeat events on existing `onEvent` channel.
- Focused heartbeat unit test.
- Grounding validator prompt clarification.
- Focused prompt contract test.

Net mechanism count:
- Unchanged.

Budget reconciliation:
- Actual file scope matched plan.
- No new fallback, retry, feature flag, semantic classifier, or parallel mechanism.

Verification:
- Targeted tests and `npm -w apps/web run build` passed for both committed fixes.
- Prompt reseed succeeded.
- Services restarted and health checks passed.
- Live job `ecd2f2be...` succeeded and confirmed no `UNVERIFIED`, no report-damaged, no eventstream warnings, progress 100, and active Stage 2 heartbeat events.

Debt accepted and removal trigger:
- Accepted residual: long single LLM-call plateaus remain; consider separate event/progress design for Stage 3/4 long calls if Captain prioritizes UX monitoring.
- Accepted residual: AC_02 support-side citations can still be omitted from verdict arrays despite support evidence being present; revisit with a prompt or LLM repair strategy only if it recurs as a user-facing citation integrity problem.

Residual debt:
- `direction_rescue_plausible` still appears in the final live job.
- Exact comparison runs are stable away from `UNVERIFIED`, but verdict label/truth/confidence still vary within the false/leaning-false band.
