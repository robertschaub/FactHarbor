---
### 2026-04-16 | Lead Developer + LLM Expert | Claude (Opus 4.7, 1M) | Report-Review Skill Systematic Review and Improvements

**Task:** As Lead Developer + LLM Expert, review the `/report-review` skill (`.claude/skills/report-review/SKILL.md`) for correctness, genericity compliance, anti-self-eval-bias hardening, missed diagnostic signals, and workflow completeness. Apply improvements directly.

**Files touched:**
- `.claude/skills/report-review/SKILL.md` — 9 targeted edits, ~100 new lines; file grew 352 → 441 lines
- `Docs/AGENTS/Handoffs/2026-04-16_Lead_Developer_LLM_Expert_Report_Review_Skill_Improvements.md` (this file)
- `Docs/AGENTS/Agent_Outputs.md` — index row appended

**Key decisions:**

1. **Phase 1a SQL expanded.** Added `ExecutedWebGitCommitHash`, `PromptContentHash`, `UpdatedUtc` to the initial Jobs SELECT so Phase 0's commit-hash scope filter operates at SQL level without needing to parse every ResultJson. `UpdatedUtc - CreatedUtc` also gives runtime, which Phase 3h uses for concurrency-pressure detection.

2. **Phase 1 extraction schema corrected against live ResultJson.** Previous schema named three fields that do not exist:
   - `resultJson.boundaries[*]` → correct field is `resultJson.claimBoundaries[*]`
   - `claimVerdicts[*].verdictLabel` → correct field is `claimVerdicts[*].verdict` (the top-level report verdict uses `verdictLabel`; per-claim uses `verdict`)
   - `claimVerdicts[*].claimText` → not present; closest fields are `reasoning` and `verdictReason`
   These three bugs would have caused Phase 1 to silently extract empty data, downstream phases to report "nothing to review", and any agent running the skill to conclude (wrongly) that the job was fine.

3. **Added `meta.llmCalls`, `evidenceBalance.total`, `applicability`, `jurisdictionMatch` as first-class Phase 1 fields.** These are the primary signals for detecting the Stage-2 evidence-extraction collapse pattern we observed live on 2026-04-16 (Bundesrat + Plastic reruns at HEAD `35a22fba` returned `UNVERIFIED 50/0` with `evidenceBalance.total == 0`, `llmCalls: 12`, and 467 Fix3 LLM timeouts logged that day). Without these, the skill had no way to distinguish infrastructure-induced collapse from a prompt/code regression.

4. **Added derived `isDegenerate` helper.** Computes `(meta.evidenceBalance.total == 0) OR (meta.llmCalls < 20 AND claimCount >= 2) OR (all claimVerdicts[*].verdict == null)`. Phase 3c and Phase 3h both consume this to short-circuit distributional checks when structural collapse is already proven.

5. **New Phase 3h — Systemic health & concurrency-induced failure.** Mandatory dimension run on every invocation. Four checks: (a) concurrency-induced collapse pattern (2+ reports within 5s with evidence==0 and llmCalls<20 → `INFRASTRUCTURE-CONCURRENCY`), (b) LLM-timeout pressure via debug-log grep threshold, (c) model fallback cascade from `runtimeRoleModels[*].fallbackUsed`, (d) prompt rollout drift via config.db `active_hash` query. Infrastructure findings SKIP Phase 4 debate and go directly to Phase 5 as `workflow-gate` or `ucm-config` fixes. This is the most consequential addition — without it, the skill would have mis-labelled the Bundesrat/Plastic collapse as a regression and proposed prompt edits.

6. **Phase 2a source 4 aligned with constraint 9 (index-first).** Replaced the "10 most recent handoffs" scan with a `handoff-index.json` query filtered by `roles ∩ {llm_expert, lead_developer, lead_architect, senior_developer}` and `topics ∩ {report, quality, bug_scan, analyzer, prompt, verdict, evidence, boundary} ∪ {family slugs in scope}`. Fallback to filename scan only if the index is missing.

7. **Phase 4 panel map rewritten to counter self-eval bias.** Per LLM Expert Role Learnings ("LLM self-eval bias"), LLMs rate same-family output higher on correlated dimensions. Every panel row now has a two-column split: **structural checks** (count-based, schema-based, cross-reference — MUST run first, MUST cite observed values) and **subjective lens** (only runs after structural). Examples of structural checks introduced:
   - Verdict Reasoning: "does `verdictReason` reference any evidence ID NOT in `supportingEvidenceIds ∪ contradictingEvidenceIds`?" (citation-graph check, objective)
   - Warning Severity: "is each warning `type` present in `warning-display.ts`?" (registry check, objective)
   - Evidence & Boundary: "per boundary: is `evidenceScopeIds.length > 0`?" (schema check, objective)

8. **Formalized sub-agent brief template.** A single verbatim template with `<<…>>` placeholders replaces the prior implicit brief. Strict `[STRUCTURAL] [FINDING] [FIX] [NEW]` line-prefix return format so the main thread can parse panel output by regex. This is the same discipline the `assessTextSimilarityBatch` Role Learning advocates — when a prompt is reused across many call sites, make it explicit and stable so regression-testing is possible.

9. **Phase 5 adds `data-update` mechanism.** Updating `benchmark-expectations.json` after verified reruns previously had no formal mechanism — agents would hand-edit it ad-hoc. Now explicit: data-only updates are allowed, but `qualityStatus` changes require a direct rerun confirmation or Captain approval (not inference from the same data that triggered the update). Rule 2 not violated — data file, no analytical logic.

10. **Phase 7 gains output modes.** `--full` / `--dry-run` / concise default. Default is concise (7a + top-10 findings + top-5 fixes + escalations). `--full` emits every subsection; `--dry-run` emits scope summary plus a "would analyze" list and stops before Phase 4 agent spawn. `--dry-run` is particularly important because each Phase 4 spawn is non-trivial cost (up to 5 sub-agents); `/report-review` being used routinely (e.g., on every commit) needs a cheap plan mode.

11. **Phase 7a scope summary adds infrastructure signals.** `Degenerate count`, `LLM-timeout rate`, `Active prompt` hash+timestamp. These are the exact three signals that would have made the 2026-04-16 Bundesrat/Plastic debugging session a 1-minute task instead of 30 minutes.

12. **Phase 8 reviewer tightening.** The auto-write gate now runs an explicit 5-check reviewer (prompt-file named, section identified, observation specific, root cause is prompt-not-infra, no near-duplicate in existing register). LOW-RISK=yes only if all four REGISTER-ELIGIBLE checks pass AND the near-duplicate check finds nothing. If a near-duplicate is found, the reviewer proposes `UPDATE-EXISTING=<id>` so Phase 8 appends a confirmation to the existing entry rather than creating a new one. Every Phase 8 decision is logged in 7d's `Phase 8 log` for audit.

**Open items:**

- Not implemented: a small cross-run trend aggregator (would read all jobs for the last N commits and surface quality-per-family trends). Listed as Phase 6 meta-recommendation already; worth building as a separate read-only script under `scripts/` rather than folding into the skill.
- Not implemented: machine-readable schema contract for `benchmark-expectations.json`. Currently relies on JSON conventions; a Zod schema + CI-side drift check would prevent hand-edit accidents. Small task, but out of scope for this review.
- The `Bundesrat rechtskräftig` and `Plastic` isolated reruns flagged in `benchmark-expectations.json §highPriorityReruns` have NOT been run yet. They remain the priority empirical work — the skill now knows what to do with their results, but it cannot substitute for the observation.

**Warnings:**

- Two failing unit tests in the repo at HEAD are unrelated to this skill work but will affect agents who run `npm test` as a pre-flight check:
  - `apps/web/test/unit/lib/analyzer/llm-routing.test.ts:30` — expects `claude-sonnet-4-5-20250929` but resolver now returns `claude-sonnet-4-6`
  - `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts:3526` — expects 1 search query but default fixture now legitimately triggers 2
  See `Docs/AGENTS/Handoffs/2026-04-16_Unassigned_Daily_Bug_Scan_Analyzer_Test_Drift.md` for the underlying test-drift analysis.

- Active prompt blob (`977aaac7…`, seeded `2026-04-16T15:43:12Z`) ≠ current file hash. Until someone runs `npm -w apps/web run reseed:prompts`, any new job on this machine will run on the stale prompt. The skill's Phase 3h now detects this, but detection does not fix it.

- The Anthropic Opus 4.6 classifier was intermittently unavailable during this work session (several Edit calls bounced with "temporarily unavailable"). Retries succeed once the classifier is back. Not a code issue — infrastructure note for future agents hitting the same outage.

- Phase 4 sub-agent spawning costs scale with panel count. Under `--full` mode with all 5 panels active, a run costs ~5× a single sub-agent invocation plus main-thread cost. Don't promote `/report-review` into a per-commit hook until the concise/dry-run modes have been empirically validated.

**For next agent:**

- **First test of the improved skill:** run `/report-review` (concise mode) against the current HEAD with the two failed reruns from 2026-04-16 either still in scope or replaced with isolated-rerun data. Expected behavior: Phase 3h files `INFRASTRUCTURE-CONCURRENCY` against Bundesrat + Plastic; Phase 4 does not spawn a Prompt Genericity Reviewer for them; Phase 5 proposes `workflow-gate` (serialize submissions) or `ucm-config` (lower `FH_RUNNER_MAX_CONCURRENCY` from 3 to 1 temporarily).
- Relevant files if debugging the skill's behavior:
  - `.claude/skills/report-review/SKILL.md` — the skill itself
  - `Docs/AGENTS/benchmark-expectations.json` — Phase 2a source 1 (authoritative expectation bands)
  - `Docs/AGENTS/index/handoff-index.json` — Phase 2a source 4 (constraint 9 index-first)
  - `apps/web/src/lib/analyzer/claimboundary-pipeline.ts:383-399` — the `loadPromptConfig` provenance-capture `.catch` that explains `promptContentHash: null` on SUCCEEDED jobs (documented in Phase 1)
  - `apps/web/src/lib/analyzer/research-extraction-stage.ts:540-545` — the Fix3 applicability fallback (`keepAllEvidence` on failure) that Phase 3h's LLM-timeout-pressure check refers to
- If a future rerun of Bundesrat or Plastic (individually, not concurrently) produces a GOOD verdict, use the Phase 5 `data-update` mechanism to update `benchmark-expectations.json §families[slug].latestVerifiedJobId` AND clear the `_failed_rerun_2026-04-16` note AND remove the family from `highPriorityReruns`. Keep `qualityStatus` unless Captain approves a change.

**Learnings:**

Appended to `Role_Learnings.md`? **Yes** — under LLM Expert:

---

## Amendment (same session) — Phase 3i: historical regression analysis

Captain followed up with: *"the skill shall also look through the job history and find if the same input was better before and find out what change has caused the regression and analyze if a partial rollback or modification would undo/fix the regression."*

Added Phase 3i (conditional — only runs when Phase 3a files a regression against a family whose current stored `qualityStatus` claims it was solved). Five sub-steps:

1. **3i.1** — SQL exact-match lookup on `InputValue` for prior SUCCEEDED runs, plus `test-output/` grep on `inputValue`.
2. **3i.2** — Deterministic bench-score rubric (+2 verdict match, +1 each for truth band, confidence band, boundaryCount, evidence>0, not-degenerate). `lastGoodJob` = highest scorer. If no prior beats current → emit `NO-PRIOR-BETTER` and exit 3i for that input.
3. **3i.3** — `git log <lastGoodCommit>..HEAD` filtered to `apps/web/prompts/ src/lib/analyzer/ configs/` (drops doc-only / test-only commits).
4. **3i.4** — Prompt-blob diff via `config_blobs` table when both hashes are recoverable, falling back to `git show <commit>:<file>` (marked `COMMIT-APPROXIMATE`).
5. **3i.5** — Bisection guidance (never auto-run; recommends `/validate <slug>` at window midpoint if >3 commits).
6. **3i.6** — Rollback feasibility classification: `SAFE-FULL-ROLLBACK`, `PARTIAL-ROLLBACK`, `MODIFICATION`, `NOT-ROLLBACKABLE`.

**New Phase 4 panel:** Regression-Rollback Reviewer. Active only when 3i has findings. Structural checks: (a) does `lastGoodJob` actually score higher? (b) does the window contain a commit touching the implicated section? (c) would reverting affect other families from `benchmark-expectations.json`? (d) does the reverted wording pass rule 1 + rule 7?

**New Phase 5 mechanisms:** `partial-rollback`, `full-rollback`, `modification`. Fix block gains `Rollback-from`, `Rollback-class`, `LastGood-job` fields (populated only when the fix originates from 3i). `NOT-ROLLBACKABLE` targets do NOT emit a rollback fix — they route to forward-fix mechanisms.

**New Phase 7b/7f output:** `REGRESSION:` block in each per-report snapshot when 3i fires, plus three new escalation hints covering multi-commit window bisection, safe-rollback Captain-review, and fully-entangled regressions.

**Key design choice — constraint inheritance:** rollback mechanisms inherit all non-negotiable constraints. A rollback to wording that violates rule 1 (benchmark-specific vocabulary) is REJECTED regardless of quality delta — the `MODIFICATION` class exists precisely for this case, where the direction of the change was correct but the specific wording broke something.

**Why this addition matters:** without 3i, the skill could only say "this report is below expectations" — not "and here is the specific commit that caused the drop, and here is whether reverting is safe." The 2026-04-16 Bundesrat/Plastic situation happened to be infrastructure (caught by 3h), but if it had been an actual regression introduced by, say, the `35a22fba refactor(prompt): generalize foreign_reaction wording and add contrastive pair` commit, 3i would have surfaced that commit as the likely cause, diffed the `FOREIGN_REACTION` section, and classified rollback as `PARTIAL-ROLLBACK` (revert just the contrastive-pair addition).

**Open items unchanged from above.** Same Warnings. Same For-next-agent notes. The `Learnings` entry below still applies — in fact, 3i's rollback-feasibility classification is a second operational form of "force LLMs to count first": the reviewer must cite whether other families depend on the section before proposing a revert, not just intuit it.

---

## Second amendment — final review by 5-panel debate

Captain asked for a final multi-agent review. Spawned 5 parallel general-purpose agents under distinct lenses: Lead Architect (structural flow), LLM Expert (prompt engineering + anti-bias), Code Reviewer (field/schema correctness against types.ts + Entities.cs), Senior Developer (operational soundness on Windows), Devil's Advocate (constructive attack).

**Reconciliation — findings that survived debate and were applied (17):**

HIGH (correctness or operational — would fail in practice):
1. **Code Reviewer** — `AnalysisIssueCode` / `AnalysisIssueMessage` are NOT `Jobs` table columns; they are response-shape fields computed in `JobsController.cs` from `resultJson.analysisWarnings`. Removed from the Phase 1a SQL; added note on where to read them.
2. **Code Reviewer** — `claimBoundaries[*]` schema was wrong. Actual fields per `types.ts:867-883`: `constituentScopes`, `evidenceCount`, `internalCoherence`, plus `name`, `shortName`, `description`, `methodology`, `geographic`, `temporal`. Per-boundary direction lives on `claimVerdicts[*].boundaryFindings[*].evidenceDirection` or on `evidenceItems[*].claimBoundaryId`. Fixed.
3. **Code Reviewer** — `evidenceItems[*].jurisdictionMatch` is a transient LLM-scoring field in `research-extraction-stage.ts:36`, not persisted on the final `EvidenceItem`. Removed from Phase 1 extraction list with an explicit note.
4. **Senior Developer** — `sqlite3` CLI fallback was only in Phase 1a; Phases 3h, 3i.1, 3i.4 would hard-fail on this Windows machine. Hoisted the fallback plus `SQLITE_BUSY` handling to a shared preamble at the top of Phase 1.
5. **Senior Developer** — `submittedWithin5sOfOthers` was referenced but never defined. Added a precise definition (`|CreatedUtc_i - CreatedUtc_j| ≤ 5s` for any other in-scope job; vacuously false for size-1 scope).
6. **Devil's Advocate (single proposal)** — expectations staleness gap. Added a mandatory **staleness gate** to Phase 2a: count analyzer/prompt/config commits between the family's `latestVerifiedJobId` commit and HEAD; if >`expectationStalenessThreshold` (default 10, UCM-overridable), Phase 3a emits `RERUN-NEEDED` instead of a false regression. This is the single highest-ROI addition from the debate.

MEDIUM (structural or LLM-hygiene — material quality gains):
7. **LLM Expert** — skill body cited benchmark entities (`bolsonaro_result.json` example, `WWII asylum` in Phase 3a). Replaced with generic placeholders (`*_result.json`, `families where expectedVerdictLabels: null`).
8. **LLM Expert** — Phase 8 Check 3 ("observed behavior specific … not speculative") was a gameable soft gate. Made enumerable: count distinct jobIds cited, distinct concrete field values, presence of ≥8-char quoted wording — eligible iff `jobIds ≥ 1 AND (fieldValues ≥ 1 OR quoted wording present)`.
9. **LLM Expert** — Phase 4 brief pasted all 9 constraints to every panel (~2.7k redundant tokens × 6 panels). Now pastes rules 1/2/7 verbatim (the ones panels most commonly violate) and summarizes 3/4/5/6/8/9 by number + one-line meaning.
10. **Lead Architect** — Phase 4 had no defined behavior when findings exist but no panel-mapped dimension fires (e.g., only 3b or 3g findings). Added explicit **skip clause**: Phase 4 is skipped entirely; findings carry to Phase 5 with confidence downgraded one tier.
11. **Lead Architect** — Phase 8 overlapped with `/prompt-diagnosis §6` — both could write the same finding to the register. Added precondition: skip the write if `/prompt-diagnosis` already wrote for `HEAD-SHA` within 24h, logged as `PROMPT-DIAGNOSIS-OVERLAP`.
12. **Senior Developer** — missing `debug-analyzer.log` / locked `config.db` paths were not handled. Added graceful-degradation: emit `LLM-timeout rate: unknown — log missing` / `CONFIG-DB-LOCKED` in 7a and continue with downgraded confidence.
13. **Senior Developer** — Phase 8 auto-write had no Windows concurrency/partial-write guard. Added atomic `.tmp`+rename procedure with `REGISTER-LOCKED` skip when the destination is held by an editor.

LOW (polish, completeness):
14. **Lead Architect** — Devil's Advocate panel had no "Findings assigned" spec in the brief template. Added a DA branch: receives full surviving-findings set + all panels' `[FIX <1..3>]` headlines.
15. **LLM Expert** — Constraint 5 could be misread as forbidding any string literal. Added parenthetical clarifying "analysis-affecting" excludes log messages, error codes, warning-type identifiers, schema keys, enum labels.
16. **LLM Expert** — `<<panel allowlist>>` placeholder was unspecified. Added a canonical **Panel Allowlists table** mapping each panel → files it may open.
17. **Senior Developer** — no cap on very-large scope. Added **sampled mode** for scope >20 reports: first 5 + last 5 + 5 outliers by `abs(observed_truthPct − midpoint(band))`.

**Proposals rejected in reconciliation (deferred with rationale, not discarded):**

- **Devil's Advocate Challenge 1** (delete Phases 1–2, shell out to `/prompt-diagnosis`) — genuine overlap, but this turns `/report-review` from an end-to-end tool into a thin orchestrator. That is a distinct product decision, not a defect fix. Defer to a future design pass.
- **Devil's Advocate Challenge 2** (collapse 4-class rollback rubric to 2) — 4 classes map to distinct Phase 5 mechanisms; collapsing would lose the `MODIFICATION` path. Keep.
- **Devil's Advocate Challenge 3** (reduce Phase 4 panel fanout) — structural checks could run main-thread for free, but cross-panel confirmation is the primary anti-bias anchor. Keep the panels; consider profiling in a future iteration.
- **Devil's Advocate Challenge 4** (Phase 8 auto-write needs human review) — the tightened Check 3 + the new `PROMPT-DIAGNOSIS-OVERLAP` + near-duplicate check already close most of the auto-write risk. A `--propose-only` mode would be a clean add for a future pass.

**Verified no bugs introduced:** the `AnalysisIssueCode|jurisdictionMatch|bolsonaro_result.json` grep returns exactly one hit — the explanatory note at line 108 that `jurisdictionMatch` is NOT persisted — which is the intentional documentation that closes the Code Reviewer's finding.

Final size: 573 lines (from 529 before this debate). All 11 top-level sections preserved. Self-check invariants at the end of the skill remain intact.

### 2026-04-16 — Structural rubric before subjective evaluation in multi-agent debate skills
**Role:** LLM Expert  **Agent/Tool:** Claude Code (Opus 4.7, 1M)
**Category:** useful-pattern
**Learning:** When a skill spawns LLM sub-agents to evaluate other LLM-generated output (the `/report-review` Phase 4 panels case, where panels assess verdicts/reasons/warnings), every panel's brief MUST lead with structural checks (count-based, schema-based, citation-graph checks) that cite observed values before any subjective evaluation. The structural checks are cheap, deterministic, and self-anchoring — they pin the panel to evidence before vibes can take over. This is the operational form of the pre-existing "LLM self-eval bias" learning: the mitigation isn't "don't use LLMs to eval LLMs", it's "force them to count first". Example structural checks that work well: "does `verdictReason` reference any evidence ID NOT in `supportingEvidenceIds ∪ contradictingEvidenceIds`?" for reasoning review; "is each warning `type` registered in `warning-display.ts`?" for severity review. Key design move: put the structural checks in a dedicated column of the panel map table, not buried in panel prose — this makes it impossible to skip.
**Files:** `.claude/skills/report-review/SKILL.md` (Phase 4 panel map and sub-agent brief template)
