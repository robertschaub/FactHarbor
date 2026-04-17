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

- **First test of the improved skill:** run `/report-review` (concise mode) against the current HEAD with the two failed reruns from 2026-04-16 either still in scope or replaced with isolated-rerun data. Expected behavior: Phase 3h files `INFRASTRUCTURE-CONCURRENCY` against Bundesrat + Plastic; Phase 4 does not spawn a Prompt Genericity Reviewer for them; Phase 5 proposes `workflow-gate` (serialize submissions) or `env-var-change` (lower `FH_RUNNER_MAX_CONCURRENCY` from 3 to 1 temporarily — per AGENTS.md this is env-var, NOT ucm-config).
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

---

## Third amendment — independent GPT-5.4 adversarial review

Captain commissioned an independent adversarial review from a GPT-5.4 agent (VS Code Copilot) after the 5-panel debate, specifically briefed to find what the debate missed. The GPT review produced 3 genuinely new findings, 3 substantively wrong applied-fixes, and 1 high-value addition. All 7 were applied; 0 were rejected. This is the highest-signal review of this skill to date — a reminder that cross-model review catches different classes of issue than same-model debate.

**Genuinely new findings the 5-panel debate missed:**

1. **HIGH — `input=<slug>` scoping used `inputPreview` instead of `inputValue`.** Phase 0 resolved the slug by matching against the display-truncated `inputPreview` field (≤130 chars). Long Captain-defined inputs — notably the Portuguese Bolsonaro variant at 190+ chars — would silently not match. Cross-checked against `Entities.cs` (separate `InputValue` and `InputPreview` columns) confirmed the miss. Fixed: Phase 0 now explicitly compares against the full `inputValue`.

2. **HIGH — no selector-validation gate for user-controlled `$ARGUMENTS`.** The skill accepted jobId / commit / test-output-path tokens and fed them into later shell (`git rev-parse`, `git show`, `git log`), SQL (`sqlite3`), and filesystem reads with no canonicalization. Prompt/scope injection surface. GPT's proposed Phase -1 selector gate was applied inline in Phase 0: jobIds must be `^[0-9a-fA-F]{32}$`, commits must pass `git rev-parse --verify --quiet <sha>^{commit}`, test-output paths must canonicalize under the repo tree (no absolute paths, no `..` traversal, no escaping symlinks), flags must be exact-string match. Any failure stops with `SELECTOR-REJECTED` before Phase 1.

3. **MEDIUM — the skill self-violated its own rule 9.** Rule 9 requires index-first for handoff scans, but Phase 2b still instructed direct `Grep` of `Docs/AGENTS/Handoffs/`. The 5-panel debate had the LLM Expert panel checking anti self-eval bias and the Lead Architect checking structural flow, but neither cross-checked constraint 9 against every Phase — a direct grep path survived. Fixed: Phase 2b now re-queries `handoff-index.json` with stage/fingerprint added to the topics filter; directory grep is only a documented fallback when the index is missing, matching the Phase 2a contract.

**Applied-fixes that were substantively wrong (all corrected):**

4. **Handoff-index role filter too narrow.** The debate's filter admitted only `{llm_expert, lead_developer, lead_architect, senior_developer}`. GPT verified against the live index that the most recent operational prior art on this repo (prompt-rollout drift, daily bug scans, unit-test drift) lives under `roles: ["unassigned"]` entries. Excluding them hid exactly the evidence the skill most needs. Fixed: filter now admits `{llm_expert, lead_developer, lead_architect, senior_developer, devops_expert, code_reviewer, agents_supervisor, unassigned}` with an explicit note on why `unassigned` is included deliberately.

5. **Phase 8 overlap guard was too coarse.** The debate added a HEAD-level gate ("skip if any `/prompt-diagnosis` wrote within 24h on this HEAD"). That suppresses unrelated prompt findings that merely share a commit. The correct duplicate-suppression already exists in Check 5 of the reviewer brief (per-finding `(Pcode, prompt-file, root-cause word-overlap)` matching). Fixed: removed the HEAD-level gate; Check 5's `UPDATE-EXISTING` handling owns per-finding deduplication.

6. **Concurrency mitigation named the wrong config tier.** Phase 3h and Phase 5 proposed `ucm-config` for reducing `FH_RUNNER_MAX_CONCURRENCY`. Per `AGENTS.md §Configuration Placement` (line 171), this variable is explicitly env-var tier, not UCM — it lives in `.env.local` / process env and takes effect only on runner restart. Fixed: Phase 3h now specifies `workflow-gate (serialize submissions) or env-var change`, and Phase 5 gains a new `env-var-change` mechanism row with the full env-var-tier knob list from AGENTS.md.

**GPT's single high-value addition (applied):**
The selector-validation gate (item 2 above) was the proposed addition. GPT also did not find a new field-schema mismatch — the Code Reviewer panel's runtime-types cross-check was sound.

**Deferral reviews:**
GPT agreed with 3 of 4 debate deferrals (Challenges 1, 2, 3) and disagreed with Challenge 4 (`--propose-only` mode for Phase 8): with selector validation added and the coarse HEAD-level overlap gate removed, a propose-only mode is still a useful future add because Check 5 is a single LLM's reviewer output, not a structural guarantee. Recorded as an open item; not implemented in this amendment (scope creep).

**File state after this amendment:** 585 lines (from 573). All prior invariants preserved. The only `AnalysisIssueCode|jurisdictionMatch|bolsonaro_result.json` grep hit remains the single intentional documentation note at line 108 explaining that `jurisdictionMatch` is not persisted.

**Meta-observation for future reviews:** the 5-panel same-model debate missed the self-contradiction with its own rule 9 (item 3) — every panel read the constraint list but none cross-checked it against every Phase. A cross-model adversarial review caught it immediately. Recommend that any skill with self-referential constraints (rules that bind the skill's own behavior) gets a cross-model pass before being called done.

---

## Fourth amendment — Quality expectations extracted into `report-quality-expectations.json`; Q-catalog architecture

Captain commissioned another independent review — this time briefed to mine the canonical quality criteria (`Docs/WIP/2026-04-11_Canonical_Quality_Criteria.md` with 33 Q-codes, and `Docs/WIP/2026-04-08_Complete_Quality_Assessment_and_Plan.md`) against the skill's current dimensions. The review surfaced 21 documented quality expectations; I accepted 13, accepted-with-caveat (annotation-dependent) 4, deferred 4 (subjective or code-audit scope).

Captain's instruction: *"have the quality expectations in a file separate from the skill file, but referenced by the skill file."*

**New file: `Docs/AGENTS/report-quality-expectations.json` (440 lines).** Mirrors the `benchmark-expectations.json` architectural pattern: machine-readable, authoritative, extensible. Contains:

- **31 Q-code check definitions** across categories `hard-failure-floor`, `stage1-claim-quality`, `evidence-quality`, `verdict-quality`, `stability`, `benchmark-expectation`, `input-integrity`, `warning-severity`, `infrastructure`, `regression`. Each entry has `name`, `category`, `severity`, `source`, `description`, `structuralCheck`, `onFail`, `status`. Annotation-dependent checks carry `annotationRequired` (the expected field in `benchmark-expectations.json`).
- **`dimensionMap`** — explicit mapping from skill Phase IDs (`pre-3a`, `3a`, `post-3a`, `3b`–`3j`) to the Q-codes that run in each. Adding a new Q-code = JSON edit, no skill-file change.
- **`notIncludedInSkill`** — documents why 8 canonical Q-codes were deliberately excluded (Q-AH1/Q-AH2 = `/audit` scope; Q-EV3 = subjective lens handled by Phase 4 panel; Q-S1.2/S1.4/S1.5/S1.7 = subsumed or require fixtures; Q-EV8 = internal weighting observable only indirectly). Every excluded Q-code has a documented alternative path.
- **`pendingAnnotationsInBenchmarkExpectations`** — documents the per-family annotation schema needed for annotation-dependent Q-codes: `anchorTokens` (Q-S1.3), `minDistinctEvents` (Q-S1.1), `trueButMisleading` (Q-V6), `crossLanguageVariantOf` (Q-ST5). Annotation absence is NOT a failure — those checks skip silently.

**Skill changes (`.claude/skills/report-review/SKILL.md`, 573 → 601 lines):**

1. **Phase 2a gains source 0** — `report-quality-expectations.json` is loaded BEFORE `benchmark-expectations.json` (which remains source 1). Describes the relationship: skill describes HOW; JSON describes WHAT. Graceful degradation: if the JSON is missing, the skill falls back to the inline checks in Phase 3.

2. **Phase 3 intro gains a "Check catalog" paragraph** — every filed finding must cite `qCode` so downstream panels, fix proposals, and register entries can trace back to the canonical criterion.

3. **New pre-3a gates** — Q-HF1 (runtime integrity: SUCCEEDED + no hard-fail warnings) and Q-HF4 (every verdict has non-empty citedEvidenceIds) run BEFORE any semantic dimension. Failures short-circuit Phase 3 to prevent wasting tokens on a broken report; they skip Phase 4 entirely and route to Phase 5 as `stage-code-structural` or `workflow-gate` fixes.

4. **New post-3a gate** — Q-HF6 (confidence < 40 should not publish). Presentation-contract check that surfaces violations lower-tier findings otherwise obscure.

5. **New Phase 3j — Stability analysis** — activates only when scope contains ≥2 reports sharing the same `InputValue` (or cross-language variants linked via annotation). Runs Q-ST1/Q-ST2/Q-ST3/Q-ST4/Q-ST5/Q-ST6 deterministically. Cites the full group in findings, not a single job. Never triggers extra reruns — that is Captain's `/validate` call. Multi-commit groups are routed to 3i instead (regression surface, not stability).

6. **Dimension set reference updated** — `(pre-3a, 3a–3j, post-3a)` replaces the old `(3a–3h)`. 3j findings route to Evidence & Boundary Reviewer (Q-ST3/Q-ST4) or Verdict Reasoning Reviewer (Q-ST1/Q-ST2/Q-ST6/Q-ST5) in Phase 4 — no dedicated Stability panel (avoids panel count creep).

7. **`FINDINGS` record template gains `qCode` as a required field** and extends `dimension` to `pre-3a|3a–3j|post-3a`, `type` to include `STABILITY`.

8. **One residual `ucm-config` fix** — line 316's dimension-set summary had stale `workflow-gate or ucm-config` wording. Updated to `workflow-gate, stage-code-structural, or env-var-change` (matches the GPT-review correction at Phase 3h and Phase 5).

**Q-codes accepted (with their skill location):**

| Q-code | Check | Skill location |
|---|---|---|
| Q-HF1 | Runtime integrity (status + hard-fail warnings) | pre-3a |
| Q-HF4 | Evidence citation minimum (citedEvidenceIds > 0) | pre-3a |
| Q-HF6 | Confidence publication floor (≥40) | post-3a |
| Q-S1.1 | Multi-event claim coverage | 3d (annotation-dependent: `minDistinctEvents`) |
| Q-S1.3 | Truth-condition preservation | 3b (annotation-dependent: `anchorTokens`) |
| Q-S1.6 | Opinion-contestation immunity | 3e |
| Q-EV5 | Source diversity (≥3 sourceType) | 3c |
| Q-EV6 | Per-claim research completeness | 3c |
| Q-V1 | Verdict-vs-evidence direction alignment | 3e |
| Q-V6 | Truth-vs-misleadingness separation | 3e (annotation-dependent: `trueButMisleading`) |
| Q-V7 | Evidence-backed contestation only | 3e |
| Q-ST1–Q-ST6 | Six stability checks | 3j (new phase) |

**Q-codes deliberately not included:** Q-AH1, Q-AH2 (code-audit scope — `/audit`), Q-EV3 (subjective — Phase 4 panel covers it), Q-S1.2 (subsumed by Q-ST3+Q-ST6), Q-S1.4 (regression-fixture scope — `/validate`), Q-S1.5 (no annotation yet), Q-S1.7 (audit scope), Q-EV8 (internal weighting — not observable from job output alone).

**Architectural consequence:** extending the skill's check coverage no longer requires editing SKILL.md. Add a Q-code entry to `report-quality-expectations.json.checks`, add it to `dimensionMap[<phase>]`, and the skill picks it up on the next invocation. This is the first time this repo's skills have a clean separation between procedure (skill) and policy (data file). Recommend replicating the pattern for `/audit` and `/prompt-diagnosis` in a future pass.

**Open items unchanged from prior amendments** plus one new: the four annotation-dependent Q-codes are inert until `benchmark-expectations.json` families gain their annotations. The JSON's `pendingAnnotationsInBenchmarkExpectations` section documents the schema; Captain or a future agent should add annotations as the data is known (e.g., `anchorTokens: ["rechtskräftig"]` for `bundesrat-rechtskraftig`). Without annotations, Q-S1.1/Q-S1.3/Q-V6/Q-ST5 skip silently — which is the right default, but means the canonical quality bar is not fully enforced until annotations are populated.

---

## Fifth amendment — `Captain_Quality_Expectations.md` added as human-readable companion

A parallel agent produced a human-readable one-page summary at `Docs/AGENTS/Captain_Quality_Expectations.md` and linked it from `Docs/AGENTS/README.md` under "Tooling & Reference" alongside both JSONs. Reviewed and incorporated:

**Authority relationship (now explicit in SKILL.md Phase 2a source 0):**
- `report-quality-expectations.json` — authoritative for mechanical Q-code `structuralCheck` definitions, severity levels, and `dimensionMap`
- `benchmark-expectations.json` — authoritative for per-family `expectedVerdictLabels`, bands, `qualityStatus`, `latestVerifiedJobId`
- `Captain_Quality_Expectations.md` — authoritative for **intent, rationale, and current "still open" status per family** (narrative layer Captain can read without parsing JSON). NOT authoritative for mechanical bands — when the MD's prose disagrees with a JSON value, the MD is updated to match (it is the derived narrative view).

**Drift-containment rule:** when the JSONs change (new band, new Q-code, new family), the MD is updated in the same commit. This keeps the two sources consistent without requiring a mechanical drift-check tool. The MD's "Last updated" line + git history serve as the audit trail.

**Cross-references added:**
- SKILL.md Phase 2a source 0 now mentions the MD as the human-readable companion with the authority distinction documented
- This amendment closes the information loop so future agents onboarding to the skill discover all three files

**Verified content quality of the MD:** bands in the prose table match `benchmark-expectations.json` as of 2026-04-16; Q-code exclusions aren't enumerated (correctly — that lives in the JSON's `notIncludedInSkill`); generic expectations section covers the AGENTS.md non-negotiables plus the Q-code categories at a narrative level. No drift spotted.

**The proposed change is small and durable** (the other agent's self-description is accurate): one MD file, one README entry, no new skill phases, no new constraints. The MD is a view, not a new source of truth. This is the right pattern — human-readable narratives that derive from machine-readable data are cheap to maintain and high-value for Captain-facing review.

---

## Sixth amendment — four-panel review of the quality-expectations triad

Captain asked for a focused review of the three quality-expectation files (MD + two JSONs) from four distinct lenses: content accuracy, skill-integration contract fit, new-agent onboarding UX, and Captain human usability. Panels returned 20+ findings; 15 survived reconciliation, 5 deferred as LOW or out-of-scope. Fifteen applied.

### Applied — skill correctness (6)

1. **`Pcode` → `qCode` mismatch fixed** (Phase 8 Check 5, SKILL.md:553; finding template SKILL.md:379). The Phase 8 near-duplicate gate was matching on `Pcode` which no Q-code-era finding carries; that floods the register with duplicates. Check 5 now matches on `qCode` (primary) OR `Pcode` (legacy `/prompt-diagnosis` entries).
2. **3g dimension now has `Q-SYS1`** (`report-quality-expectations.json:dimensionMap`, new `Q-SYS1` check). 3g is a re-tagging pass; the Q-SYS1 entry documents that it inherits the contributing dimension's Q-code, and the `FINDINGS` template now specifies the inheritance rule.
3. **Multi-Q-code bucketing rule added** (SKILL.md:311). When multiple Q-codes fire on the same evidence in one dimension, file one FINDING per Q-code and set a shared `rootCauseId`; Phase 5 uses the shared id to collapse fixes.
4. **Annotation-absence detection procedure specified** (SKILL.md Phase 2a source 0 + JSON `_annotationDependency`). Absent = key missing OR value null OR (for arrays) length 0. Cross-family refs outside scope skip silently. Empty arrays = "no tokens to check" = silent skip, not failure.
5. **Q-HF6 `publishedReport` field fixed** (JSON). The structuralCheck referenced a non-schema field. Rewritten as `status == 'SUCCEEDED' AND confidence < 40` with an explicit note that publication is not observable from this skill.
6. **Three under-specified `structuralCheck` entries tightened** (JSON Q-EV_LANGUAGE, Q-EV6, Q-V7, Q-INF_TIMEOUT_PRESSURE). Each now has computable thresholds or explicit field paths instead of prose like "consistent with" or "see Phase 3h" (circular).

### Applied — MD authority and discoverability (6)

7. **Authority rule moved into the MD body** (Captain_Quality_Expectations.md header). A cold reader can now answer "if MD and JSON disagree, which wins?" from the first paragraph, without opening the skill.
8. **Reading order fixed** — the MD itself is step 1; JSONs are 2 and 3; AGENTS.md is 4. The prior order silently self-demoted the file.
9. **Q-code prefix legend added to the JSON** (`_qCodePrefixLegend`). New agents can decode HF / S1 / EV / V / ST / BE / IN / WS / INF / REG / SYS / AH from the file itself without hunting through source docs.
10. **README "Tooling & Reference" preamble** — one sentence identifies the three-file quality-expectations triad, names `/report-review` as the consumer, and states the authority rule. Closes the "files listed as independent siblings" UX gap.
11. **MD "intent authority" claim honestly downgraded** (SKILL.md Phase 2a source 0). The skill previously claimed the MD was authoritative for intent; no phase actually consumed intent. Now accurately positioned as onboarding/context only. Honest is better than aspirational.
12. **`Q-SYS*` provenance entry added** to the JSON `_qCodeProvenance` so the new Q-code family has a clear origin note.

### Applied — Captain human usability (3, via full MD rewrite)

13. **Release Summary header added** — Good/Watch/Not-validated counts with slugs; explicit "release-blockers: none" line. Captain can now answer "can we ship?" from the first 10 lines.
14. **Family table restructured to intent-first** — each row leads with what the family actually tests ("Must not collapse to UNVERIFIED on Stage 1; the rechtskräftig anchor must survive extraction") followed by bands in parentheses. Prior order buried intent behind numbers.
15. **"Still Open" → "Next Actions" work list** — each concern now has a concrete next-action column and a gates-release column. No more worry-list-without-owner.

Additional MD cleanup: collapsed the dual pointer sections ("Authoritative Sources" + "Practical Reading Order" both said "the JSONs are authoritative, go read them") into a single Reading Order list that includes the MD as step 1. De-leaked agent-register phrases ("Q-code checks... annotation-dependent... inactive") into human language ("Some cross-input checks are dormant until more families are tagged").

### Deferred with rationale (5)

- Content Accuracy: "Visible contamination problem solved" vs `SOLVED-VISIBLE-CONTAMINATION` (LOW — aligned enough)
- Content Accuracy: Reading order omits two background sources (LOW — addressed by the MD rewrite moving them to a dedicated "Background Sources" footer)
- Onboarding UX: `pendingAnnotations` + "Still Open" minor duplication (LOW — the cross-reference in the rewritten Next Actions table implicitly closes this)
- Skill Integration: Q-WS1 "verdict-impact potential per the AGENTS.md severity table" doesn't quote the table (MEDIUM — defer; the table is in AGENTS.md and stable)
- MD "intent feeds Phase 4 panel" option — the more-ambitious path of actually reading MD prose at runtime. Rejected in favor of the honest downgrade. If Captain later wants runtime MD consumption, the cleaner path is adding the per-family intent as a `captainIntent` field on `benchmark-expectations.json.families[slug]`.

### Verified no regressions

- `Pcode` still valid as secondary key for legacy `/prompt-diagnosis` entries — backward compatible.
- All 8 benchmark families still match between MD table, `benchmark-expectations.json`, and `AGENTS.md §Captain-Defined Analysis Inputs` (byte-exact inputValues).
- Skill file size 601 → 606 lines. JSON 440 → 466 lines. MD 66 → 75 lines. README 81 → 83 lines. All changes additive-or-substitutive, no deletions of load-bearing content.

---

## Seventh amendment — GPT-5.4 post-A6 adversarial review (7 fixes applied)

Captain commissioned a second cross-model adversarial review after Amendment 6. GPT-5.4 (VS Code Copilot) returned 3 HIGH findings, 2 regressions from A6, and 3 dangling/underspecified items — all correctly anchored to file:line, all real. Amendment 6 had stopped at documentation where structural consumption was needed. All 7 substantive fixes applied.

### Applied

1. **Phase 8 register schema + dedup key space aligned.** A6's fix made Check 5 qCode-aware but the stored register block format was still P-code-only — so qCode-era findings could never `UPDATE-EXISTING`; the register flooded with duplicates. Fixed: the Phase 8 `[FORMATTED BLOCK]` write-out now mandates an explicit `qCode:` line alongside `Pcode:`, with `Pcode: n/a` when no P-code mapping exists. Legacy entries remain backward compatible. Added explicit note that qCode and Pcode are distinct taxonomies with no crosswalk — matching a qCode-era finding against a legacy Pcode-only entry is not attempted, which is the honest outcome (different vocabularies, overlapping concerns, new entry is correct).

2. **Stale Phase 8 operator note corrected.** The prose note beneath Phase 8 still said duplicate suppression matches on `(Pcode, prompt-file, root-cause word-overlap)`, which no longer matched the live Check 5. Rewritten as `(qCode OR Pcode, prompt-file, root-cause word-overlap)` with the taxonomy-distinction explanation inline.

3. **Q-V7 schema-honest rewrite.** A6's tightened structuralCheck referenced `challengeResponses[j].factualBasis` + pre/post snapshots — none of which exist in live types. Verified against `types.ts:281-295` (KeyFactor has factualBasis), `types.ts:975-991` (CBClaimVerdict has challengeResponses), `types.ts:1075-1081` (ChallengeResponse has verdictAdjusted but no factualBasis, no snapshots). Q-V7 now runs in two tiers: (a) STRUCTURAL PROXY on `verdictAdjusted + reasoning text` (SPECULATIVE-only confidence); (b) FULL CHECK escalated to `/audit` of aggregation-stage.ts contestationWeights. The check honestly admits it cannot achieve CONFIRMED from ResultJson alone.

4. **rootCauseId / Q-SYS1 normalized with deterministic tie-break.** Previously the skill's FINDINGS template used `rootCauseId`, Q-SYS1 grouped on `(qCode, root-cause)` with no formal precedence. Fixed: `rootCauseId` is the single canonical grouping key, format `<first-firing-qCode>-<8-char-hash(evidence values)>`. 3g clustering on severity tie uses lexicographic ordering of qCode strings. `contributingQCodes` (new array field) lists every qCode that participated when 3g/3j re-tag across multiple primaries.

5. **Phase 3g prose now describes Q-SYS1 computation.** The old 3g section said only "if 2+ reports share a finding, tag it SYSTEMIC" — cold readers had to reconstruct the algorithm from the FINDINGS aside and the Q-SYS1 JSON description. Fixed: Phase 3g section now has a 4-step algorithm (cluster by `(qCode, rootCauseId)`, emit SYSTEMIC when cluster ≥2, handle multi-qCode rootCauseId clustering, leave unclustered findings as REPORT-SPECIFIC).

6. **Phase 5 rootCauseId consumption added.** The FINDINGS template introduced `rootCauseId` as a grouping key but Phase 5 had no consumption step. Fixed: Phase 5 now has a mandatory post-ordering "rootCauseId grouping pass" that collapses fix blocks with shared rootCauseId into one primary with secondary `Related fixes:` list. Prevents the fix list from showing three separate blocks when Q-V1 + Q-V_REASON_CITATION + Q-V_LABEL_DIRECTION all fired on one defect.

7. **`sources[].searchQuery` added to Phase 1 extraction.** Q-EV6's tightened structuralCheck depended on this field to distinguish researched evidence from Stage-1-seeded evidence, but the Phase 1 extraction list didn't tell the agent to load it — so Q-EV6 would have silently fallen back to the "if meta exposes researchedEvidenceCount directly" branch, which isn't populated on every pipeline variant. Fixed.

### Meta-recommendation added (not implemented)

**Phase 6 gained a "Quality-expectations drift guard" proposal** — a structural CI validation that would mechanically detect: (a) every Phase 8 register block can represent `qCode`; (b) every JSON `structuralCheck` field path exists in live `types.ts`; (c) every family band in `Captain_Quality_Expectations.md` prose matches `benchmark-expectations.json`. Would detect cross-file drift without relying on cross-model review. Respects rule 2 (structural validation, not analytical decision logic). Not implemented here — it's tooling work, not skill work — but logged as the right next step.

### Deferred

None. Every GPT finding was accepted and addressed. The Q-V7 fix is a partial solution (downgrade from claimed full-structural to honest two-tier) rather than a full fix, but that matches the underlying schema reality — over-specifying a check the data can't support would have been the original bug.

### Meta-observation

A6 was a 4-panel same-model review; A7 was a cross-model adversarial review on A6's output. Same pattern as A3: the cross-model pass caught structural-consumption gaps that the same-model panels documented around without structurally closing. Same-model review validates surface framing; cross-model review pressure-tests the contract. Recommend: any non-trivial skill amendment should get at least one cross-model adversarial review before being called done. Already logged as learning in `Role_Learnings.md` after A3; this is the second instance of the pattern.

### Final file sizes after A7

- `SKILL.md`: 606 → ~625 lines (+19)
- `report-quality-expectations.json`: 466 → ~470 lines (Q-V7 rewritten, not expanded)
- `Captain_Quality_Expectations.md`: 75 (unchanged)
- `README.md`: 83 (unchanged)

---

## Seventh amendment — patch 7.1 (JSON residuals)

Cross-file audit after A7 found two spots where the skill had the A7 contract but the JSON was still on the pre-A7 wording:

1. **Q-SYS1 description/structuralCheck** said "group on (qCode, root-cause)" — the pre-normalization phrasing. Rewritten to match the skill's Phase 3g algorithm: cluster on `(qCode, rootCauseId)`, multi-qCode clusters pick highest-severity primary with lexicographic tie-break, populate `contributingQCodes`. `report-quality-expectations.json` Q-SYS1 now carries the same *contract* as `SKILL.md §Phase 3g` — not literal identical prose (the JSON compresses the 4-step algorithm into one `structuralCheck` string; the skill spells it out step-by-step), but the rules, tie-break, and field names are consistent.

2. **Q-S1.6 structuralCheck** had the same schema-incoherence as the original Q-V7 — referenced `challengeResponses[j].factualBasis` which doesn't exist on `ChallengeResponse` (types.ts:1075-1081); `factualBasis` lives on `KeyFactor` (types.ts:281-295). A7 fixed Q-V7 but missed the sibling. Rewritten with the same two-tier honest pattern: STRUCTURAL PROXY on `verdictAdjusted + reasoning text` with SPECULATIVE confidence; FULL CHECK escalated to `/audit`.

This is the drift-guard use case the new Phase 6 meta-recommendation describes. Until that CI check exists, cross-file audits like this one catch them by hand. Amendment 7 claim is now consistent with repo state.

---

## Seventh amendment — patch 7.2 (drift-guard v1)

Implemented the Phase 6 meta-recommendation from A7 as a standalone validator, per Captain's scope guidance: narrow v1, no new dependencies, not yet wired into `npm test`.

### New files / changes

- **`scripts/validate-quality-expectations-drift.mjs`** (~220 lines, no deps) — v1 runs three checks:
  1. **Register-schema.** Entries in `Docs/AGENTS/Prompt_Issue_Register.md` whose maximum cited date is after the A7 cutover (2026-04-16, hardcoded constant — deterministic, no partial schema inference) must carry a `qCode:` line. Pre-cutover entries are exempt. Silent pass when the register file doesn't exist yet.
  2. **JSON field paths.** Every dotted token in `report-quality-expectations.json §checks[*].structuralCheck` rooted in one of 8 known runtime objects (`meta`, `claimVerdicts`, `analysisWarnings`, `evidenceItems`, `sources`, `searchQueries`, `languageIntent`, `claimBoundaries`) must resolve to a field declared in the type-source files. Prose tokens not rooted in a known runtime object (e.g. `aggregation-stage.ts`, `contestationWeights`) are ignored by design.
  3. **MD bands vs JSON bands.** Every benchmark-family row in `Captain_Quality_Expectations.md`'s table must match `benchmark-expectations.json` on `truthPercentageBand.{min,max}`, `confidenceBand.{min,max}`, and `minBoundaryCount`. Rows where MD and JSON both declare no bands (e.g. `asylum-wwii-de`) pass silently.

- **`package.json` script:** `npm run validate:quality-drift`. NOT wired into `npm test` — separate failure class; decide `test:ci` inclusion after it's proven quiet in practice.

- **Silent on pass, `DRIFT: <file:id> — <observed ≠ expected>` on stderr, exit 1 on failure.**

### Drifts surfaced by the first real run (both fixed before declaring v1 done)

The v1 fired on its first run, which was the proof-of-value moment. Two drifts, both legitimate:

1. **Script scope gap.** `meta.runtimeRoleModels[*].fallbackUsed` flagged as unresolvable. Investigation: `RuntimeRoleModels` is declared in `apps/web/src/lib/analyzer/claimboundary-pipeline.ts:234,260`, not in `types.ts`. v1 was scanning only `types.ts`. Fixed by extending `PATHS.typeSources` to include `claimboundary-pipeline.ts` — kept narrow (no all-of-apps/web scan).

2. **Captain_Quality_Expectations.md shorthand drift.** The `bundesrat-simple` row used "same band set" as shorthand instead of spelling out the truth/conf numbers. The MD parser couldn't resolve the shorthand and flagged it as null — exactly the derived-view-falls-behind-data risk the guard exists for. Fixed the MD to carry the explicit bands.

### What v1 deliberately does NOT do

- No prose-reference parsing (e.g. `aggregation-stage.ts`, `contestationWeights` in `structuralCheck` descriptions are ignored). Keeping the false-positive rate at zero matters more than catching these.
- No ts-morph or TypeScript parser dependency. Field extraction is a regex over `/(^|[\s,{])(\w+)\s*\??\s*:/g` — over-matches function params and object keys, which is acceptable for an existence check (false negatives would be worse).
- No MD Release Summary classification check (Good/Watch/Not validated). Narrative, brittle; the table-band check is the mechanical guard.
- Not wired into `npm test`. Add to `test:ci` or a dedicated CI step only after the script has been stable across several unrelated changes.

### Meta

The drift guard's first real run immediately surfaced drift created within the same amendment (A7) — a textbook case of why the guard is justified. Two drifts caught by a ~220-line single-file script with no dependencies; both would otherwise have had to wait for a human or cross-model review pass. Positive validation of the approach.

---

## Eighth amendment — Rule 10: no destructive operations without Captain's permission

Captain added non-negotiable constraint 10: the skill reads freely but MUST emit every state-changing action as a proposal requiring explicit Captain approval. This supersedes the earlier auto-write design (Captain's original directive was "auto-write but only if low risk confirmed by reviewer agent"; that has been withdrawn in favor of a strict propose-only posture).

**Scope of "destructive"** (per the new rule 10): any file write to the repo (register, benchmark-expectations.json, Captain_Quality_Expectations.md, prompt files), any real-LLM test run (`test:llm`, `test:neutrality`, `test:cb-integration`, `validate:run`), prompt reseed (`reseed:prompts`), build, git mutation, env-var/config change, or applied rollback. Read operations (sqlite3 read-only, git log/show/diff, grep, JSON reads, debug-log reads) remain free.

### Applied

1. **Non-negotiable constraint 10 added** (SKILL.md top). Explicitly lists the forbidden autonomous actions and states this rule overrides any prior amendment that permitted autonomous writes.

2. **Phase 8 rewritten from auto-write to propose-only.** The 5-check reviewer sub-agent still runs (its output is still a structural confidence signal), but its role changes: it produces a confidence-qualified proposal for Captain, not an approval gate for autonomous writing. Phase 7d gains a `Proposed register entries` subsection that carries the block plus the reviewer's outcomes (REGISTER-ELIGIBLE / LOW-RISK / UPDATE-EXISTING). On explicit Captain approval, the agent performs the Windows-safe atomic write. The near-duplicate handling rules (qCode/Pcode fallback, UPDATE-EXISTING) are preserved — they still inform the proposal's shape.

3. **Phase 5 `data-update` mechanism explicitly flagged as propose-only.** The mechanism row now carries a rule-10 reminder: Captain approves before any write to `benchmark-expectations.json` or `Captain_Quality_Expectations.md`.

4. **Self-check gains a destructive-action sweep.** Before reporting, the skill scans every Phase 5/6 fix proposal and every Phase 8 register block; anything that would execute autonomously is reclassified as a pending proposal under the appropriate `Proposed ...` 7d subsection.

### What this resolves

This closes GPT-5.4's A6 Challenge 4 deferred item (`--propose-only` mode for Phase 8). At the time, Challenge 4 was logged as "disagree with deferral" — the 5-check reviewer was a single-LLM gate on a persistent register, and a human-review step was warranted. Captain's rule 10 is stricter than the proposed `--propose-only` flag: it is unconditional, not opt-in.

### What this does NOT change

- The 5-check reviewer brief (quality of the proposal) remains the same
- The Q-SYS1 / rootCauseId / contributingQCodes contracts are untouched
- The drift-guard script is unaffected
- No change to the MD, JSONs, or README — this is a skill-behavior constraint
- The skill's analytical logic is unchanged — rule 10 is a safety rule, not an accuracy rule

### Implication for first-use

First live invocation is now fully non-destructive by contract. Captain sees proposals in 7d, can approve register writes, expectation-file updates, rollbacks, or real-LLM reruns one by one. Lower-risk-first-use posture — aligned with "first-use is the last honest review."

### Calibration (same session) — final rule 10 shape

Captain noted the first A8 draft was over-restrictive and calibrated rule 10 across several iterations in this session. The final shape has **two tiers**:

**Allowed without per-run approval** (skill may execute, subject to the pre-condition gate in the "Further calibration" subsection below):
- All reads (unchanged).
- **Prompt reseeds** (`npm -w apps/web run reseed:prompts`) — fixes active-blob drift; no code/data change.
- **ONE `/validate <family-slug>` per skill invocation**, with hard input constraints: the slug must exist in `benchmark-expectations.json.families[]`; the submitted input must be the canonical `inputValue` byte-exact; no paraphrase, translation, normalization, or novel input allowed. Cost expectation $1–5, logged in Phase 7a. Cross-references AGENTS.md §Captain-Defined Analysis Inputs ("agents do not invent inputs").

**Require Captain approval** (proposal only): repo file writes, multiple `/validate` calls or full real-LLM suites, git mutations, applied rollbacks, env-var / config changes, deployment actions (`git push`, `gh workflow run`, gh-pages writes, CI triggers, deploy-targeted builds), novel-input submission.

**Edit history of this calibration:** (1) initial draft was single-tier "propose-only on everything" — too restrictive; (2) second draft added a three-tier split with "Forbidden even with approval" for deployment and novel-input — unnecessarily special-cased, since Captain can approve anything in principle; (3) final form collapses to two tiers. Deployment and novel-input still go through Captain approval like any other non-trivial proposal; the skill itself never autonomously submits either. For novel-input specifically, the skill should prefer proposing family-addition to `benchmark-expectations.json` + `AGENTS.md` first, but Captain may approve a direct submission if desired.

**Rationale.** The two autonomous allowances are the ones the skill actually needs: reseed fixes a recurring operational friction (documented in `feedback_deploy_config_state.md`), and a single focused `/validate` covers Phase 3i bisection-midpoint narrowing and Phase 3j stability disambiguation. Every other risky action is proposal-only.

**Self-check.** The destructive-action sweep at end of skill validates every `/validate` execution: exactly-one, slug in the approved set, input byte-exact against the family's canonical `inputValue`, pre-condition gate passed, no reseed in the same invocation. Autonomous novel-input execution or deployment execution is always a rule-10 violation. Proposals for these actions flow through the Captain-approval path like any other proposal.

This calibration closes Captain's concern that the absolutist first draft would have forced approval round-trips for routine diagnosis, while preserving the structural safety properties: no novel inputs autonomously, no deployment autonomously, no unlogged cost, no autonomous writes to the register or expectations files.

### Further calibration (same session) — pre-condition gate on reseed and `/validate`

Captain added an operational rule: "before a new job submission, always commit and restart services after any code or prompt change." Applied to the skill's allowed-execution paths as a pre-condition gate.

**Gate (mandatory before the skill executes a reseed or a `/validate`):**

1. **Git clean on analyzer/prompt/config paths** — `git status --porcelain apps/web/src/lib/analyzer/ apps/web/prompts/ apps/web/configs/` must be empty. Dirty tree → reclassify as proposal with "Captain: commit changes to <paths>, then approve" note.
2. **No active `PROMPT-ROLLOUT-DRIFT`, AND drift state must be definitively established.** Phase 3h's detection is indirect — it compares `config.db` active hash against every in-scope report's `meta.promptContentHash` and flags drift only when no match is found AND `activated_utc` predates HEAD's prompt commits. A direct file-hash comparison is not possible because the hash is computed over the canonicalized blob (`computeContentHash` in `config-schemas.ts`), not raw file bytes. The gate therefore has three outcomes: (a) drift flagged → refuse; (b) Phase 3h confirmed no-drift because at least one in-scope report's `promptContentHash` matches the active hash → pass; (c) scope contained no recoverable `promptContentHash` values (Phase 3h could not establish the negative) → treat as UNKNOWN and refuse, emit a note asking Captain to confirm rollout state. This is an honest limitation of what the skill can structurally verify; earlier wording that implied a direct hash comparison has been corrected.
3. **Reseed and `/validate` separated across invocations** — the skill cannot structurally verify a web-server restart, so it cannot combine the two in one pass. Reseed → emit `Captain: restart apps/web dev server before the next skill invocation` → stop. The next invocation runs the validate.

**Self-check tightened again.** Rule-10 sweep now verifies the pre-condition gate passed immediately before any reseed or `/validate` execution, and that the two actions are never combined in one invocation. Violations logged under `Rule-10 violations` in 7a; findings derived from invalid runs are NOT emitted.

**Rationale.** Validating against a dirty tree gives approximate provenance (already documented in the `DIRTY-STATE: true` handling). Reseeding and validating in the same invocation would validate against a state the running web server hasn't yet picked up — the test would still use the old blob. The one-invocation-per-action rule trades a minor UX cost (Captain restarts between reseed and validate) for a structural correctness guarantee.

This tightening is operational, not analytical — same category as the rule 10 calibration above. The skill's analytical logic remains unchanged.

---

## Ninth amendment — Phase 7g: Captain escalations (agent-team-cannot-resolve)

Captain asked for an explicit escalation rule covering the case where the skill's team of agents hits a problem that cannot be self-resolved or mitigated. The existing Phase 7f handled "here's a follow-up skill you should run" hints, but there was no structured output for "we tried and failed — you need to decide." Added as Phase 7g alongside 7f with a clear role split: 7f = follow-up hints, 7g = unresolved state requiring Captain.

### Design — reviewed and narrowed before implementation

Initial proposal had 8 categories (A–H); reviewer flagged three problems before any code landed, so the final shape shipped as 6 narrower categories:

- **A narrowed.** Original category was "debate deadlock" — too broad, since ordinary Devil's Advocate rebuttal is already a resolved path (findings downgrade or drop under the existing Phase 4 reconciliation rule). A now fires only when reconciliation leaves a material finding with NO surviving compliant proposal: ≥2 panels CONFIRM, Devil's Advocate rebuts every proposed fix with a concrete regression risk, and no alternative mechanism passes the rule 1–10 gate.
- **B kept.** Pre-condition UNKNOWN — no recoverable `meta.promptContentHash` values for Phase 3h to establish drift state. Also stops execution of the attempted reseed or `/validate` (rule 10 pre-condition gate), not just flags.
- **C + D merged into one "Compliance deadlock".** The original split (constraint-deadlock detected in Phase 5 vs. self-violation caught in the self-check sweep) was the same failure class surfaced at different times. One label avoids Captain seeing two escalations for one underlying state.
- **E narrowed.** Only fires when a second `/validate` is genuinely needed in a later invocation because this invocation's single-`/validate` result was ambiguous. "Could use more data in general" belongs in Phase 7f as a hint.
- **F dropped.** Original category was "scope ambiguity after validation." Reviewer correctly pointed out selector ambiguity is already handled at Phase 0 (exact-match + unique-prefix fallback; else stop and ask Captain). A commit hash that matches two distinct job sets is intended scope, not ambiguity. F had no real unhandled failure class.
- **G narrowed.** Only fires when cross-skill ordering materially affects validity AND the skill cannot determine the order. If the skill can name the order (e.g., "run `/audit` first, then `/prompt-diagnosis`"), it's a 7f hint.
- **H kept.** Unclassifiable systemic pattern — multiple reports show a consistent pattern that doesn't fit any known Q-code, infrastructure signature, or regression pattern. Captain either adds a new Q-code (→ `/audit` + `report-quality-expectations.json` update) or identifies the pattern.

Final count: **6 categories (A, B, C, E, G, H).**

### Output format

```
CAPTAIN ESCALATION <A|B|C|E|G|H> — <one-line problem statement>
  Why the skill can't resolve:  <concrete: what was tried, what failed>
  Captain needs to decide:      <specific question or choice>
  Suggested next steps:         <2-3 options, if any>
  Blocking impact:              <what of the skill's output is unreliable or absent while this is unresolved>
```

### Behavior rules

- Flag-and-continue by default — the skill emits 7a–7f normally, then appends 7g escalation blocks. Findings stay on record with their current confidence; they are not silently dropped.
- Exception: Category B, when triggered by an attempted `/validate` or reseed, also stops the execution per rule 10's pre-condition gate. The escalation is emitted; the action is withheld.
- Multiple escalations in one run emit in category order (A→B→C→E→G→H), one block per category.
- No escalations → 7g is omitted entirely. No "escalations: none" header (noise).

### Role split vs Phase 7f

- **7f** points Captain at what skill to run next (`/audit`, `/prompt-diagnosis`, `/validate`). These are recommendations with known paths.
- **7g** tells Captain what decision to make when no path is available to the skill. These are genuinely open questions.

This distinction matters because a reader of 7f knows what to do; a reader of 7g knows they must decide something first. Conflating them into one section would hide the difference between "next step" and "blocking question."

### Not a new non-negotiable constraint

Rules 1–10 are prohibitions ("the skill MUST NOT..."). Escalation is a behavior pattern ("when the skill cannot resolve X, emit Y"). Lives in Phase 7 alongside output formatting, not in the Non-negotiable constraints section.

### What this resolves

Previously: a constraint-deadlock finding (e.g., a real verdict-misdirection Phase 3e caught, but every proposed fix would violate rule 1's generic-by-design) would be surfaced as `Rejected fixes (policy violations)` in Phase 7d without any clear signal that this was a genuinely blocking state Captain needs to decide about. 7g makes that state structurally visible and actionable — Captain sees the finding AND the dilemma, rather than having to infer the dilemma from the absence of a proposed fix.

---

## Tenth amendment — Phase 9: post-execution learnings and improvement proposals

Captain asked that agents who execute `/report-review` document learnings relevant to other agents or Captain, and propose skill or expectations improvements when any pattern emerges — all in a dedicated skills-learning document. Implemented as Phase 9 + output section 7h, reading Phase 2 updated to close the feedback loop.

### Reviewer-surfaced design issues (closed before implementation)

A pre-implementation review flagged four issues with the initial proposal; all four were addressed before the code landed:

1. **HIGH — write-only file.** Proposed learnings would have been write-only unless Phase 2 also read `Skills_Learnings.md` on future runs. Closed: Phase 2a source 3 now includes `Skills_Learnings.md` (filtered to `Skill: /report-review`) as a sibling of `Role_Learnings.md`; Phase 2b dynamic grep now covers both files. `for-agents` learnings feed back into subsequent invocations.
2. **HIGH — self-check coverage.** Rule 10's destructive-action sweep previously only covered Phase 5/6 proposals and Phase 8 register blocks. Closed: sweep extended to Phase 9 learning/improvement proposals explicitly, with the target-file list enumerated (Skills_Learnings.md, SKILL.md, benchmark-expectations.json, report-quality-expectations.json, Captain_Quality_Expectations.md, Prompt_Issue_Register.md).
3. **MEDIUM — README pointer conflict.** Initial plan added a README link to a file that intentionally doesn't exist until the first approved write. Closed: README edit deferred. Captain adds the pointer AFTER the first approved write creates `Skills_Learnings.md` — otherwise the index would be inaccurate from day one.
4. **MEDIUM — lifecycle table staleness.** Adding an internal post-execution reflection step makes the "Review = external only" claim partial. Closed: Review row now reads "Mostly external — Phase 9 runs a post-execution reflection that produces learning/improvement *proposals* (not judgments on the run's analytical output)." The footer update notes Phase 9 as "the internal-reflection complement to external Review."
5. **OPEN QUESTION — Skill field on persisted entries.** Without a mandatory `Skill:` field, a shared `Skills_Learnings.md` becomes ambiguous when other skills start writing. Closed: `Skill: /report-review` is mandatory on every persisted-entry block from day one. Phase 2 filtering depends on it.

### Design shipped

**Four categories** (unchanged from proposal — reviewer confirmed the split was sound):

- `for-agents` — tactical gotcha/shortcut/pattern that saves the next `/report-review` agent time
- `for-captain` — recurring pattern Captain should know that isn't a finding on the analyzed jobs
- `skill-improvement` — specific gap in phases, checks, or sub-agent briefs that a future amendment should close
- `expectations-improvement` — gap in `benchmark-expectations.json`, `report-quality-expectations.json`, or `Captain_Quality_Expectations.md`

**Phase 9 behavior:**
- Reflects across the four categories after Phases 1–8 complete, before Self-check
- Propose-only — rule 10 applies verbatim to every Phase 9 write
- Threshold: propose only concrete learnings; never manufacture learnings to fill space
- Persisted-entry format has mandatory `Skill:`, `Category:`, `Agent/Tool:`, `Observation:`, `Relevance:`, `Related:` fields
- Explicit boundary with Phase 6: Phase 6 = patterns in *analyzed jobs*, Phase 9 = patterns in *executing the skill*. If both apply, Phase 6 owns it and Phase 9 references it (no double-listing)
- Empty Phase 9 → empty 7h → section omitted (match 7g convention; no "learnings: none" noise)

**Phase 2 read-back:**
- Source 3 gains `Skills_Learnings.md` as sibling file with `Skill: /report-review` filter
- Dynamic grep in 2b scans both learnings files

**Output 7h:**
- Emits one block per learning in category order (for-agents → for-captain → skill-improvement → expectations-improvement)
- Concise mode includes 7h whenever any fire — same carve-out as 7g (proposals requiring Captain approval aren't verbosity)
- Dry-run mode: 7h is moot (reflection-after-execution; dry-run stops before execution)

**Rule 10 integration:**
- Self-check sweep scans Phase 9 proposals alongside Phase 5/6/8
- Target files per category explicitly enumerated
- Same gate as Phase 8 — no autonomous Phase 9 write

### What Captain will see on first use

First `/report-review` invocation on this repo: no `Skills_Learnings.md` exists; Phase 2 reads note its absence silently; Phase 9 may still emit proposals under `for-agents` or other categories in 7h. If Captain approves any, the skill writes `Skills_Learnings.md` for the first time, carrying the mandatory `Skill: /report-review` field. Future invocations read it in Phase 2 and benefit from the accumulated `for-agents` tips.

### Captain follow-ups (not part of this amendment)

- After first approved Phase 9 write, Captain should add a pointer to `Skills_Learnings.md` in `Docs/AGENTS/README.md` under Tooling & Reference. Deferred here per reviewer point 3 — no dead link while the file doesn't exist.
- When another skill (e.g., `/audit`, `/prompt-diagnosis`) adopts the same post-execution reflection pattern, the mandatory `Skill:` field will keep `Skills_Learnings.md` searchable without restructuring.

### 2026-04-16 — Structural rubric before subjective evaluation in multi-agent debate skills
**Role:** LLM Expert  **Agent/Tool:** Claude Code (Opus 4.7, 1M)
**Category:** useful-pattern
**Learning:** When a skill spawns LLM sub-agents to evaluate other LLM-generated output (the `/report-review` Phase 4 panels case, where panels assess verdicts/reasons/warnings), every panel's brief MUST lead with structural checks (count-based, schema-based, citation-graph checks) that cite observed values before any subjective evaluation. The structural checks are cheap, deterministic, and self-anchoring — they pin the panel to evidence before vibes can take over. This is the operational form of the pre-existing "LLM self-eval bias" learning: the mitigation isn't "don't use LLMs to eval LLMs", it's "force them to count first". Example structural checks that work well: "does `verdictReason` reference any evidence ID NOT in `supportingEvidenceIds ∪ contradictingEvidenceIds`?" for reasoning review; "is each warning `type` registered in `warning-display.ts`?" for severity review. Key design move: put the structural checks in a dedicated column of the panel map table, not buried in panel prose — this makes it impossible to skip.
**Files:** `.claude/skills/report-review/SKILL.md` (Phase 4 panel map and sub-agent brief template)
