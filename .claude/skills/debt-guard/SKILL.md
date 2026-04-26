---
name: debt-guard
description: >
  MUST be used automatically for any FactHarbor bugfix, bug fixing task,
  regression fix, failing test/build fix, failed validation recovery, or defect
  repair before editing code. Balanced complexity-control workflow that decides
  whether the best fix is undoing or amending part of a previous change,
  quarantining/deleting obsolete code, or adding new code. Also use for
  refactors, PR reviews, agent-generated patches, net-complexity assessment,
  technical debt, maintainability, workaround stacking, fallback/flag/helper
  additions, parallel mechanisms, or whether a previous code change should be
  undone.
allowed-tools: Read Glob Grep Bash Agent
---

ultrathink

Apply debt guardrails to: $ARGUMENTS

---

## Cross-Tool Use

Claude Code users can invoke this as `/debt-guard <task>`. Other agents read this file as plain markdown: ignore `ultrathink`, treat `$ARGUMENTS` as the user's task, and when this workflow says to run `/debate`, read `.claude/skills/debate/SKILL.md` and execute that procedure manually if slash commands are unavailable.

This skill is the required pre-edit and review wrapper. If a local tool restricts edits while the skill is active, complete Phases 0-4 first, then implement normally while continuing to apply Phases 5-7.

---

## Purpose

This workflow prevents additive repair drift without creating rollback bias. Agents must make a balanced decision between:

- undoing or narrowing previous changes,
- amending the existing mechanism in place,
- quarantining or deleting obsolete code,
- adding new code when the system truly lacks the required capability.

The goal is **bounded backtracking plus justified forward work**: identify the smallest existing mechanism that plausibly caused the issue, then choose the lowest-risk, lowest-net-complexity correction that preserves verified behavior.

---

## Core Rule

For every bugfix, explicitly compare the undo/amend path against the add-new-code path. Do not default to either.

Do not skip `/debt-guard` because the fix is small. Small fixes use Compact Path; risky or unclear fixes use Full Path.

## Required Path Selection

Before editing, choose exactly one path:

- **Compact Path**: allowed only when the fix is single-site, has an obvious verifier, introduces no new mechanism, touches no analysis behavior, has no ownership ambiguity, is not failed-attempt recovery, and does not require reverting or quarantining code.
- **Full Path**: required for everything else.

If any condition is unclear, use Full Path.

### Compact Path Required Output

For trivial single-site fixes, write this before editing:

```
COMPACT DEBT-GUARD
Path: Compact
Symptom:
Existing mechanism:
Mechanism touched: <function/file:line>
Prior attempt: N/A | keep | quarantine | revert
Lowest-complexity fix:
Rejected path:
Verifier: <tier / command / provenance>
Net mechanisms: decreases | unchanged | increases
Residual risk:
```

Compact example:

```
COMPACT DEBT-GUARD
Symptom: one focused test expects `cancelled` but route returns `canceled`
Existing mechanism: status normalization in `mapJobStatus`
Mechanism touched: `mapJobStatus` / `apps/web/src/lib/jobs.ts:42`
Lowest-complexity fix: amend the existing status mapping; no new branch or fallback
Verifier: safe-local / `npm -w apps/web test -- jobs-status.test.ts`
Net mechanisms: unchanged
```

If `Net mechanisms` is `increases`, stop and use Full Path.

Phases 0, 1, 2, 3, 4, 5, 5b, and 7 are mandatory for Full Path. For Compact Path, only the Compact Debt-Guard block plus final verification is required. Phase 6 is required only under its stated triggers.

Evaluate these fix families before editing:

1. **Revert** the offending previous change or hunk when validation contradicts it.
2. **Amend** the existing mechanism in place when its direction is right but implementation is wrong.
3. **Quarantine** speculative or contradicted code from the active path when ownership or future value is unclear.
4. **Delete** code made obsolete by the correction.
5. **Add** new code when evidence shows there is a missing capability or existing code cannot safely carry the behavior.

If adding code, state why undo/amend/quarantine/delete is insufficient and what existing code, if any, becomes obsolete. If undoing code, state why adding a targeted correction would be worse.

---

## Practice Anchors

Apply these practices on top of the core rule:

1. **Keep the change small and self-contained.** If the bugfix starts to mix root-cause repair, cleanup, migration, and unrelated refactor, split it. Small changes are easier to review, test, merge, and roll back.
2. **Understand before changing.** Read the existing mechanism and explain why it failed before introducing a replacement.
3. **Classify accepted debt honestly.** If the chosen fix intentionally leaves a temporary compromise, record whether it is prudent/deliberate debt or just a mess that must be corrected now.
4. **Review AI-generated code as suspect until verified.** Look specifically for duplicated logic, code smells, excessive dependencies, silent fallbacks, security-sensitive shortcuts, and tests that only validate the new workaround.
5. **Update tests with the behavior.** A bugfix that changes production behavior should either add/update focused tests or state why a different verifier is sufficient.
6. **Track recurring debt signals.** If the same class of fallback, duplicate mechanism, or failed validation appears repeatedly, add it to the final residual-debt note instead of burying it in the patch.

---

## Phase 0 - Scope And Safety

1. Restate the requested task and the behavior that must be preserved.
2. Identify whether the task is:
   - **Bugfix guard**: use for every bugfix before editing.
   - **Failed-attempt recovery**: use after a failed test/build/manual verifier.
   - **Review guard**: use while reviewing an existing diff or PR.
   - **Refactor guard**: use when consolidating duplicate mechanisms.
3. Check ownership:
   - Do not revert user changes without explicit approval.
   - If the change belongs to another active agent or the author is unclear, prefer proposing a revert/quarantine and ask the Captain before destructive action.
   - Never use destructive git commands unless explicitly requested.

---

## Phase 1 - Evidence Inventory

Build a compact evidence inventory before choosing a fix.

Required evidence:

- **Symptom**: failing test, build error, runtime behavior, review finding, or user report.
- **Verifier**: the command, log, screenshot, job, or manual check that proves the symptom.
- **Recent change surface**: files and hunks most likely related to the symptom.
- **Existing mechanisms**: current code paths that already attempt to solve this class of problem.
- **Debt signals**: duplication, oversized functions, manual overrides, excessive branching, brittle dependencies, missing tests, or TODO/fallback accumulation in the touched area.
- **Constraints**: AGENTS.md rules, stage contracts, UCM/config placement, prompt rules, or API compatibility constraints.

Use source search and file reads, not assumptions from filenames.

Output:

```
DEBT-GUARD INVENTORY
Symptom:
Verifier:
Likely recent change surface:
Existing mechanisms:
Debt signals:
Constraints:
Unknowns:
```

---

## Phase 2 - Causal Attribution

Decide whether the issue is probably:

| Classification | Meaning | Preferred action |
|---|---|---|
| `introduced-regression` | A prior change caused the issue | revert or amend the prior change |
| `incomplete-existing-mechanism` | The intended mechanism exists but is too narrow | amend in place |
| `obsolete-parallel-mechanism` | Two mechanisms now compete | delete or quarantine one mechanism |
| `missing-capability` | No existing mechanism covers the needed behavior | add code, with a removal check |
| `planned-temporary-debt` | A bounded compromise is deliberately accepted for short-term value | add owner/removal trigger and keep it isolated |
| `unplanned-mess` | The code is messy without a deliberate tradeoff | clean/amend now; do not normalize it as debt |
| `uncertain` | Evidence is not enough to choose safely | ask, instrument, or narrow verification |

Do not classify by narrative confidence alone. Tie the classification to file paths, hunks, tests, logs, or documented contracts.

---

## Phase 3 - Fix Selection Options

Evaluate these options as a decision matrix, not a priority ladder. The chosen option must follow the causal classification and verifier evidence. If the issue is clearly `missing-capability`, choosing Add directly is valid; still explain why existing mechanisms cannot carry the behavior and what obsolete compensating code can be removed.

### Option - Revert

Use when a prior change is contradicted by validation, no longer needed, or caused a regression.

Before reverting:
- Identify the exact hunk or file.
- Confirm whether it is yours, user-authored, or ambiguous.
- State what behavior the revert restores.
- Treat debt-guard reverts as minimal explicit hunk-level edits unless the Captain explicitly requests a git revert/reset/checkout.
- Do not use `git checkout`, `git reset`, or broad file restoration for debt-guard revert decisions.

### Option - Amend

Use when the prior approach is directionally correct but too broad, too narrow, or placed in the wrong layer.

Prefer changing the existing function, prompt section, test fixture, or config path over adding a sibling path.

### Option - Quarantine

Use when the code may still be useful but is unsafe in the active path, and deletion is not yet justified by ownership or evidence. Quarantine must include an owner, removal trigger, and verifier proving the inactive path cannot affect production behavior.

Examples:
- Remove it from routing and record the exact condition under which it will be deleted or restored.
- Gate it only behind an existing disabled experiment when the repo already has that pattern and the Captain accepts the temporary debt.
- Move it to a test helper or diagnostic path if it is only useful for verification.

Do not create a new feature flag or leave dormant production code merely to avoid deciding.

### Option - Delete

Use when the correction makes old code unreachable, duplicative, or misleading.

Deletion candidates:
- Compatibility branches for behavior no longer supported.
- Fallbacks that now hide real quality degradation.
- Helpers used by only the replaced approach.
- Tests that encode the obsolete mechanism rather than the desired behavior.

### Option - Add

Use after documenting why existing mechanisms cannot safely carry the required behavior, or when the classification is `missing-capability`.

When adding code:
- Reuse existing abstractions and naming.
- Add tests for the corrected contract, not only the new branch.
- Include a removal note if the addition is transitional.

Valid add example: a bug exposes a genuinely missing persistence field or API contract that no existing mechanism can represent. Adding the field can be correct, but the agent must still remove or quarantine any obsolete compensating code.

---

## Phase 4 - Complexity Budget

Before editing, write a short budget:

```
COMPLEXITY BUDGET
Chosen option: revert | amend | quarantine | delete | add
Files expected to change:
Small-change plan: single patch | split into follow-up slices
Net mechanisms: decreases | unchanged | increases
New branches/fallbacks/flags/helpers:
Code expected to remove:
Tests/verifier to add or update:
Why this is not workaround stacking:
Why the rejected path is worse:
Verifier to run:
Verifier tier: safe-local | build | expensive-LLM | live-job | validation-batch | manual-inspection
Cost class:
Expensive/live justification: none | explicit user request | quality-affecting change requiring live evidence
Runtime provenance: not needed | commit required | runtime refresh/reseed required
Debt accepted, if any: none | planned-temporary-debt with removal trigger
```

If `Net mechanisms` is `increases`, require a `missing-capability` justification or an explicit containment/removal plan.

If `Small-change plan` is not `single patch`, stop after the smallest verifier-backed slice and record follow-up slices separately.

Classify the verifier tier before editing. `quality-affecting` is a cost/risk reason for escalating verification, not a verifier tier.

- `safe-local`: structural code/tests/docs changes where targeted tests or `npm test` answer the question.
- `build`: TypeScript, config schema, runtime surface, or package changes where build coverage is required.
- `manual-inspection`: documentation, workflow, or generated-artifact checks where source inspection answers the question.
- `expensive-LLM`: real LLM test suites such as `test:llm`, `test:neutrality`, `test:cb-integration`, or `test:expensive`.
- `live-job`: a live analysis job used as verification evidence.
- `validation-batch`: a validation matrix or batch run.

Mark the change as `quality-affecting` when it changes prompts, UCM analysis defaults, model routing, evidence extraction, boundary clustering, verdict generation, aggregation, warning severity, or live-job behavior. Quality-affecting changes may justify an expensive/live verifier only when safe local verification cannot answer the question.

Default to `npm test`, targeted tests, targeted builds, and manual inspection. Do not run `npm -w apps/web run test:llm`, `npm -w apps/web run test:neutrality`, `npm -w apps/web run test:cb-integration`, `npm -w apps/web run test:expensive`, `npm run validate:run -- ...`, validation batches, or live analysis jobs unless the user explicitly requested it or the change is quality-affecting and a safe verifier cannot answer the question. Record the exact command, expected cost class, Captain-approved input set, and why safe local verification is insufficient.

For any live analysis job or validation batch after source, prompt, or config changes: commit first, refresh/restart the affected runtime or reseed config as applicable, and record the job ID plus git hash/config state. Do not use live output as verification evidence if it ran against uncommitted, stale, or unreseeded state; mark it exploratory instead.

---

## Phase 5 - Implementation Rules

During edits:

1. Keep the change scoped to the chosen option.
2. Do not introduce a second implementation path unless the old path is removed, quarantined, or explicitly scheduled for removal.
3. Do not add retries, fallbacks, compatibility modes, or flags as a default response to failing validation.
4. If validation fails, apply FactHarbor Failed-Attempt Recovery before making more edits:
   - `keep`: still justified by verifier output.
   - `quarantine`: speculative or unsafe in the active path.
   - `revert`: contradicted or no longer needed.
5. After classifying the prior attempt, an amended next attempt is allowed when `keep` is the right classification but the mechanism needs correction.
6. Broaden scope only when the verifier shows the original scope cannot explain the failure.
7. If the patch grows beyond the small-change plan, stop and split the cleanup/refactor into a follow-up unless it is required for the verifier-backed fix.

---

## Phase 5b - Post-Edit Reconciliation

Before final validation or final response, compare the actual diff to the Complexity Budget:

- Did the touched files match the expected scope?
- Did new branches, fallbacks, flags, helpers, retries, or compatibility paths appear?
- Was the expected obsolete code actually removed, narrowed, or quarantined?
- Did `Net mechanisms` increase without `missing-capability` evidence?
- Did tests verify the intended contract rather than the workaround?
- Did the actual patch stay within the small-change plan?
- Was any accepted temporary debt recorded with a removal trigger?

If the actual diff violates the budget, stop and classify the extra change as `keep`, `quarantine`, or `revert` before continuing.

---

## Phase 6 - Review And Debate

Use this phase when `Net mechanisms` increases, the fix is `failed-attempt recovery`, the patch touches more than one stage boundary, or the Captain asks for review/debate. For trivial isolated fixes with no new mechanism, no ownership ambiguity, and no analysis behavior impact, skip review/debate after recording the compact path.

### Review Pass

Ask the reviewer to look for the items below. If no separate reviewer is available and the change is not high-risk, perform this as a self-review and record residual risk.

- New code that compensates for a bad previous change instead of correcting it.
- Duplicate mechanisms or competing sources of truth.
- Fallbacks that hide real quality or correctness failures.
- Tests that bless workaround behavior.
- Missing deletions after an amendment or revert.
- Oversized patches that should be split before merge.
- Accepted temporary debt without owner, trigger, or containment.

Reviewer return format:

```
DEBT-GUARD REVIEW
Verdict: pass | pass-with-concerns | fail
Findings:
Deletion candidates:
Split candidates:
Debt classification:
Required changes before merge:
Residual risk:
```

### Debate Pass

Run `/debate --standard` only for high-risk cases: contested ownership, public API or persisted-schema deletion, cross-stage pipeline changes, prompt/config behavior changes, second failed validation, or net mechanism increase without clear missing-capability evidence. Use this proposition:

```
PROPOSITION: The proposed fix should be accepted as the lowest-net-complexity correction.
CONTEXT_MANIFEST:
  EVIDENCE_INVENTORY:
    - E1 | symptom/verifier | context
    - E2 | candidate diff or plan | context
    - E3 | existing mechanisms and deletion candidates | mixed
  KNOWN_GAPS:
    - unresolved ownership, missing verifier, or "none"
CONSTRAINTS:
  - Balance undoing/amending prior changes against adding new code.
  - Do not recommend destructive git operations without Captain approval.
  - Preserve verified behavior and AGENTS.md constraints.
TIER: standard
```

Treat the Reconciler's decision as the default recommendation, but the active agent remains responsible for the final choice. If rejecting it, state the verifier-backed reason or ask the Captain when the disagreement changes scope, ownership, or risk.

---

## Phase 7 - Output

For implementation work, include this in the final response and in any handoff written for the task so the handoff index can parse passive compliance telemetry:

```
DEBT-GUARD RESULT
Classification:
Chosen option:
Rejected path and why:
What was removed/simplified:
What was added:
Net mechanism count:
Budget reconciliation:
Verification:
Debt accepted and removal trigger:
Residual debt:
```

For Compact Path fixes, the final response and handoff block may be compact:

```
DEBT-GUARD COMPACT RESULT
Chosen option:
Net mechanism count:
Verification:
Residual debt:
```

For review-only work, lead with findings and include deletion/simplification recommendations before summary.

---

## Hard Stops

Stop and ask the Captain when:

- The only safe fix appears to require reverting ambiguous user-owned work.
- The change would delete a public API, persisted data shape, or documented behavior.
- The fix requires introducing a new parallel mechanism that cannot be removed or bounded.
- Validation contradicts the current hypothesis twice in a row.

---

## Prompt Snippets

Use these snippets when directing another agent:

```
Fix this with minimum net complexity. First identify whether a recent or existing change introduced it, whether the existing mechanism can be amended, or whether new code is genuinely required. Before editing, compare the undo/amend path against the add-new-code path and choose the verifier-backed option with the lowest net complexity.
```

```
For this bugfix, balance two paths before editing: undo/amend the prior mechanism, or add new code. Choose the path with the best verifier support and lowest net complexity. Do not assume rollback is best, and do not assume additive code is best.
```

```
Review this diff for additive repair drift. Look for workaround stacking, duplicate mechanisms, obsolete code left behind, and tests that bless the workaround instead of the intended contract. Recommend deletions, amendments, or justified additions based on evidence.
```
