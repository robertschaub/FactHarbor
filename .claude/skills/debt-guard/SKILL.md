---
name: debt-guard
description: >
  MUST be used automatically for any FactHarbor bugfix, regression fix,
  failing test/build fix, failed-validation recovery, or defect repair —
  BEFORE editing code. Decides whether the best fix is reverting or amending
  a previous change, quarantining/deleting obsolete code, or adding new code.
  Also use when about to add a fallback, flag, retry, helper, guard, or
  parallel mechanism in response to a failure, or when reviewing a diff for
  workaround stacking / additive repair drift.
allowed-tools: Read Glob Grep Bash Agent
---

Apply debt guardrails to: $ARGUMENTS

## Purpose

Prevent additive repair drift — piling new mechanisms on top of failed
attempts — without creating rollback bias. This skill is the activation
wrapper for two AGENTS.md rules that already bind you:

- **§Failed-Attempt Recovery** — classify a failed attempt (`keep | amend |
  revert | quarantine | add`), log the `ATTEMPT <n>` line, persist it via
  `node scripts/hooks/revert-classify.cjs`, name the last-known-good.
- **§Bugfix Complexity Heuristic** — identify the existing mechanism, prefer
  amend/delete/quarantine before adding a parallel path, state the verifier
  and net-mechanism impact.

The skill exists because those rules were repeatedly skipped under momentum.
Do not skip this because the fix is small — small fixes just produce a small
block.

## Required pre-edit output

Write this block in your response BEFORE the first edit of any fix attempt
(every attempt, not just the first):

```
DEBT-GUARD
Attempt: <n in this fix chain>
Symptom: <failing test / regressed job / user judgment — with verifier>
Existing mechanism: <function/file:line that should carry the behavior>
Prior attempt: N/A | keep | amend | revert | quarantine  (if n>1: ATTEMPT line logged + persisted? yes)
Chosen option: revert | amend | quarantine | delete | add
Rejected path and why worse: <the strongest alternative>
Net mechanisms: decreases | unchanged | increases
Verifier: <command / check that will prove the fix>
```

Rules for filling it honestly:

1. **Five options, no default.** Revert and amend are first-class, not
   fallbacks. If choosing `add`, state why no existing mechanism can carry
   the behavior and what compensating code becomes obsolete (then remove it).
2. **`Net mechanisms: increases` is a tripwire.** It requires a
   missing-capability justification and a removal/merge trigger. New
   fallbacks, retries, flags, or compatibility branches as a response to a
   failed attempt are workaround stacking unless so justified.
3. **Attempt ≥ 2 is the danger zone.** A second edit in the same fix chain
   without a classified prior attempt is exactly the pile-up failure mode.
   On the second failed validation, consult the advisor per AGENTS.md
   §Advisor Consultation → *Revert vs. pile-on*, with revert-to-last-known-good
   framed as the leading option.
4. **Broaden scope only with a verifier-backed reason** — state what the
   failed validation showed and why the wider scope is required.
5. **Ownership check before reverting** — never revert user-authored or
   ambiguous work without asking; restore hunks with `Edit`, never
   `git reset`/`checkout` (safety hook blocks them anyway).

## Post-edit reconciliation

Before declaring done, compare the actual diff to the block: did extra
branches/fallbacks/flags/helpers appear that the block didn't declare? If
yes, classify each as `keep | quarantine | revert` before continuing. Include
the final block (updated to match reality) in your response and in any
handoff.

## Review mode

When asked to review a diff instead of fixing: hunt for workaround stacking,
duplicate mechanisms, fallbacks that hide real failures, tests that bless the
workaround instead of the contract, and missing deletions after an amend or
revert. Lead with deletion/simplification candidates.

## Hard stops

Ask the Captain when: the only safe fix reverts ambiguous user-owned work;
the change deletes a public API, persisted data shape, or documented
behavior; validation contradicts the hypothesis twice in a row; or a new
parallel mechanism cannot be bounded or removed.
