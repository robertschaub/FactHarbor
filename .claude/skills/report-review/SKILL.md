---
name: report-review
description: Analyze local job reports from the most recent build/commit (HEAD by default), detect quality issues, and propose AGENTS.md-compliant fixes. Scopes to HEAD by default, or to specific job IDs / commit / input slug passed as argument. Uses RAG (static register + handoffs + machine-readable benchmark expectations, plus dynamic follow-up scans) and runs an adaptive multi-agent debate before emitting recommendations. Complements `/prompt-diagnosis` (which is narrower — prompt provenance only) by covering evidence, boundaries, verdict reasoning, and warning severity end to end.
allowed-tools: Read Glob Grep Bash Agent
---

ultrathink

Analyze local job reports for: $ARGUMENTS
(Leave blank to scan all jobs executed at HEAD.)

`$ARGUMENTS` may be: one or more `jobId`s (comma-separated), a commit SHA (`commit=<sha>`), a benchmark input slug (`input=bolsonaro-en`), a directory under `test-output/`, or empty.

---

## Non-negotiable constraints (applies to every phase and every sub-agent)

These constraints bind both this skill's analysis AND the fixes it proposes. If a recommendation violates any of them, downgrade it to `REJECTED — policy violation` and do not surface it to the user.

1. **Generic by Design** — no proposed fix may introduce domain-specific keywords, named entities, regions, or date-periods into source code or prompts. Benchmark inputs listed in `AGENTS.md §Captain-Defined Analysis Inputs` are targets of analysis, never vocabulary for prompts or code.
2. **No new deterministic text analysis** — do not propose regex, keyword lists, forbidden-term lists, similarity heuristics, or rule-based classifiers as fixes. Analysis decisions must stay in LLM calls.
3. **No string-match tests as mitigations** — do not recommend adding unit tests that grep prompt text for specific phrases, nor tests that assert specific words appear in verdicts.
4. **No deterministic verdict manipulation in source code** — do not propose post-hoc truth-percentage nudges, verdict-label overrides, or confidence clamps based on input content. Verdict shaping happens via prompt + aggregation logic that is input-agnostic, not via code paths that inspect the claim text.
5. **Strings that influence analysis live in two places only**: prompt text (under `apps/web/prompts/`, managed via UCM) and web-search query construction. Fixes that inject analysis-affecting strings anywhere else are rejected. ("Analysis-affecting" = strings that shape the LLM's reasoning input or search-provider queries — NOT log messages, error codes, warning-type identifiers, schema keys, or enum labels.)
6. **UCM is the home of tunables** — threshold, weight, and limit changes go through `apps/web/configs/*.default.json` + UCM, not hardcoded constants.
7. **Multilingual robustness** — a fix that only works for English (or any single language) is not a fix. Challenge any recommendation that implicitly assumes English word order, English keywords, or Latin script.
8. **Report Quality & Event Communication (AGENTS.md)** — severity reflects verdict impact, not internal noise. Do not propose downgrading a degrading-signal warning to hide it, and do not propose escalating a fully-recovered fallback to `warning+`.

9. **Index before scanning** — before listing or grepping `Docs/AGENTS/Handoffs/`, query `Docs/AGENTS/index/handoff-index.json` (filter by `roles` + `topics`). Read only the matched files. `handoff-index.json` covers agent task history only — for source code locations use grep, not this index.

**Sub-agents spawned in Phase 4 MUST be given this list verbatim in their brief.**

---

## Phase 0 — Orient

Capture the review context once, so later phases and sub-agents share a common anchor:

```bash
git rev-parse HEAD
git log --oneline -15
git status --short
```

Record:
- `HEAD-SHA` (40-char) and `HEAD-SHORT` (7-char)
- `DIRTY?` — true if `git status` has any unstaged or untracked analyzer/prompt changes (ignore docs-only changes for this flag, but note them)
- `RECENT-COMMITS` — last 15 commit one-liners (prompt and analyzer changes get priority attention later)

Then determine the review scope from `$ARGUMENTS`:
- **empty** → scope = all jobs whose `executedWebGitCommitHash` starts with `HEAD-SHA`
- **`commit=<sha>`** → scope = jobs matching that commit
- **`jobId` list** → scope = those jobs only
- **`input=<slug>`** → scope = jobs whose `inputPreview` matches the Captain-defined input keyed by that exact slug in `Docs/AGENTS/benchmark-expectations.json`. If no exact slug matches, allow a prefix match only when it resolves to exactly one family; otherwise stop and ask Captain to choose.
- **test-output subdirectory** → scope = all job JSONs under that directory

If the scope ends up empty (e.g., no jobs ran at HEAD yet), surface that immediately and ask Captain whether to (a) broaden to the previous commit, (b) request a rerun, or (c) abort. **Do not silently broaden.**

---

## Phase 1 — Load jobs

Jobs live in three places. Read all three; prefer structured fields over log text.

**SQLite access — shared preamble for Phase 1a, Phase 3h, Phase 3i.1, Phase 3i.4:** every `sqlite3` invocation in this skill must fall back to Python's `sqlite3` module in read-only mode (`uri=True, mode=ro`) if the `sqlite3` CLI is unavailable. This is a known Windows/`better-sqlite3` ABI quirk on some local setups. **Never write to `factharbor.db` or `config.db` via this skill** — both are read-only data sources. If a DB is locked by the running web server (`SQLITE_BUSY`), retry once with read-only URI (`file:apps/web/config.db?mode=ro`); if still locked, record `CONFIG-DB-LOCKED` or `API-DB-LOCKED` in Phase 7a and degrade that dimension's finding confidence to `SPECULATIVE`.

**1a. API database** (authoritative for submitted jobs):
```bash
sqlite3 apps/api/factharbor.db \
  "SELECT JobId, Status, CreatedUtc, UpdatedUtc, InputValue, VerdictLabel, TruthPercentage, Confidence, GitCommitHash, ExecutedWebGitCommitHash, PromptContentHash FROM Jobs ORDER BY CreatedUtc DESC LIMIT 30;"
```
Selecting `ExecutedWebGitCommitHash` and `PromptContentHash` lets Phase 0's commit-hash scope filter operate at SQL-level without parsing `ResultJson`. `UpdatedUtc - CreatedUtc` gives runtime, which Phase 3h uses for concurrency-pressure detection.

**Note:** `analysisIssueCode` / `analysisIssueMessage` are NOT Jobs table columns — they are response-shape fields computed from `resultJson.analysisWarnings[*]` by `JobsController.cs` at read time. Extract them from the parsed `ResultJson`, not from the SQL result.

**1b. `test-output/` artifacts** — validation batches, phase runs, loose result JSONs:
```bash
ls -t test-output/ | head -20
```
Read the newest 2–4 directories; for each, read up to 5 job JSONs (first 2, last 2, plus one outlier by `verdictLabel` or `confidence`).

**1c. Loose repo-root result JSONs** — result/baseline JSONs created by one-off API probes, named per the Captain's working file. Pattern: `*_result.json`, `*_baseline.json` at repo root. Read whichever are in scope.

For each job, extract (field names verified against live schemas in `apps/web/src/lib/analyzer/types.ts` and `apps/api/Data/Entities.cs`):
```
TOP LEVEL (from API response, not raw Jobs row):
  jobId, inputValue (full), inputPreview (truncated), verdictLabel, truthPercentage,
  confidence, status, analysisIssueCode, analysisIssueMessage

meta.*:
  generatedUtc, executedWebGitCommitHash, promptContentHash, pipelineVariant,
  boundaryCount, claimCount, llmCalls,
  mainIterationsUsed, contradictionIterationsUsed, contradictionSourcesFound,
  evidenceBalance.{supporting, contradicting, neutral, total, balanceRatio, isSkewed},
  runtimeRoleModels (per-role model + fallbackUsed flags),
  modelsUsedAll

resultJson.*:
  languageIntent.{inputLanguage, reportLanguage, retrievalLanguages, sourceLanguagePolicy}
  analysisWarnings[*].{type, severity, message, details.stage, details.errorFingerprint, details.errorMessage}
  claimBoundaries[*].{id, name, shortName, description, methodology, geographic,      // NOTE: field is claimBoundaries, not boundaries
                      temporal, evidenceCount, internalCoherence, constituentScopes}  // per-boundary direction: derive from claimVerdicts[*].boundaryFindings[*].evidenceDirection OR evidenceItems[*] filtered by claimBoundaryId
  claimVerdicts[*].{id, claimId, verdict, truthPercentage, confidence,                // NOTE: field is verdict, not verdictLabel
                    verdictReason, reasoning, supportingEvidenceIds,
                    contradictingEvidenceIds, isContested, triangulationScore,
                    boundaryFindings}
  evidenceItems[*].{id, statement, probativeValue, sourceType, claimDirection,
                    applicability, claimBoundaryId, sourceId}                          // applicability: direct|contextual|foreign_reaction. jurisdictionMatch is a transient LLM-scoring field and is NOT persisted.
  sources[*].{id, url, category, trackRecordScore, fetchSuccess}
  searchQueries[*].{query, iteration, focus, resultsCount, searchProvider}
```

**Note on `promptContentHash: null` on SUCCEEDED jobs:** the pipeline has a `.catch()` at [claimboundary-pipeline.ts:396-398](apps/web/src/lib/analyzer/claimboundary-pipeline.ts#L396) that swallows provenance-capture errors without failing the job. A null hash on SUCCEEDED is a provenance side-effect, NOT a verdict-failure signal. Do not use it as a primary diagnostic. Verify via `meta.evidenceBalance.total` and `meta.llmCalls` instead.

Filter to scope from Phase 0. For each in-scope job, split the commit hash on `+` to derive `COMMIT-HASH` and `DIRTY-STATE` (same convention as `/prompt-diagnosis §1c`).

Compute derived fields that Phase 3 depends on:
- `runtimeSeconds = UpdatedUtc - CreatedUtc`
- `submittedWithin5sOfOthers` — true iff another in-scope job has `|CreatedUtc - this.CreatedUtc| ≤ 5 seconds`. For scope of size 1, always false.
- `isDegenerate = (meta.evidenceBalance.total == 0) OR (meta.llmCalls < 20 AND claimCount >= 2) OR (all claimVerdicts[*].verdict == null)`

Build `TARGET-REPORTS[...]`.

**Scope caps:** if scope has more than 20 reports, auto-switch to **sampled mode**: first 5 by `CreatedUtc` ascending + last 5 by `CreatedUtc` descending + 5 outliers by `confidence` or `verdict` distance from the family's expected band (deterministic — sort by `abs(observed_truthPct - midpoint(truthPercentageBand))` descending). Record the sampling choice in Phase 7a so Captain can override with `$ARGUMENTS` (e.g. `jobId` list).

---

## Phase 2 — Build the RAG corpus (static + dynamic)

**2a. Static sources — always read in this order:**

1. `Docs/AGENTS/benchmark-expectations.json` — machine-readable expected quality bands per benchmark family (authoritative). Load the `families` array. For each `TARGET-REPORT`, find the matching entry by `inputValue` or exact `slug`. If the caller supplied `input=<slug>` and no exact slug matches, allow a prefix match only when it resolves uniquely; if multiple families share the prefix, stop and mark the scope ambiguous. Extract `expectedVerdictLabels`, `truthPercentageBand`, `confidenceBand`, `minBoundaryCount`, `qualityStatus`, `knownOpenIssues`, `latestVerifiedJobId`. Use `noiseTolerancePct` as the run-to-run noise floor for Phase 3a comparisons. If a family has `expectedVerdictLabels: null`, set expectation to `UNKNOWN — flag for rerun (see highPriorityReruns)` rather than flagging as a regression.

   **Staleness gate (mandatory — compute for every family in scope before Phase 3a):** fetch the commit of each family's `latestVerifiedJobId` from the API DB (`ExecutedWebGitCommitHash`, stripped of any `+dirty` suffix). Count analyzer/prompt/config-touching commits between that commit and HEAD:
   ```bash
   git rev-list --count <lastVerifiedCommit>..HEAD -- apps/web/prompts/ apps/web/src/lib/analyzer/ apps/web/configs/
   ```
   If the count exceeds `expectationStalenessThreshold` (default 10 — UCM-overridable when a future `expectationStalenessThreshold` key is added to `benchmark-expectations.json` root) OR `latestVerifiedJobId` is `null` OR the commit is not present in git (`git cat-file -t` fails), mark the family as `STALE`. Phase 3a emits `RERUN-NEEDED` for STALE families instead of a regression finding. Record the staleness state (commit count) in Phase 7a so Captain can see which families have lost expectation fidelity.

2. `Docs/AGENTS/Prompt_Issue_Register.md` (if exists) — previously diagnosed prompting deficiencies with recurrence status.

3. `Docs/AGENTS/Role_Learnings.md` — filter to entries with `gotcha` or `wrong-assumption` category, or any entry naming a pipeline stage, prompt file, schema, or model route.

4. `Docs/AGENTS/Handoffs/` — **index-first per constraint 9**. Query `Docs/AGENTS/index/handoff-index.json` and filter entries where `roles ∩ {llm_expert, lead_developer, lead_architect, senior_developer}` is non-empty AND `topics ∩ {report, quality, bug_scan, analyzer, prompt, verdict, evidence, boundary} ∪ {any benchmark family slug in scope}` is non-empty. Read only the matched files. If `handoff-index.json` does not exist, fall back to filename scan with the same keywords (and note the index gap as a Phase 6 meta-recommendation).

5. `AGENTS.md §Captain-Defined Analysis Inputs` — the canonical input wording list. Any drift between a job's `inputValue` and the canonical wording is itself a finding.

6. `CLAUDE.md` — local project snapshot. If your tool exposes separate repository memory, treat it as optional context only, not as fix authority.

Extract into `KNOWN-ISSUES[id, category, scope, source, status, description]`. Prefer 10-word descriptions.

**2b. Dynamic follow-up scans — triggered by Phase 1 findings, not speculative:**

For each distinct stage, warning type, or error fingerprint present in `TARGET-REPORTS`:
- `Grep` `Docs/AGENTS/Handoffs/` for the stage name or fingerprint (case-insensitive)
- `Grep` `Role_Learnings.md` for the same
- For any family in scope that has `knownOpenIssues` in `benchmark-expectations.json`, read the corresponding `latestVerifiedJobId` result JSON from `test-output/` if present — use it as the baseline comparator

Append findings to `KNOWN-ISSUES` with `source=dynamic-scan`.

**2c. Emit the anchor table** before proceeding:
```
| ID | Category | Scope | Source | 10-word description |
```
If empty: print `KNOWN-ISSUES: empty — all findings will be tagged NEW.`

---

## Phase 3 — Analyze (main thread)

Analyze each target report across the following dimensions. Record findings but do not commit to fixes yet — fix proposals wait until after the Phase 4 debate. Track which dimensions produced findings; this gates Phase 4 spawning.

**3a. Expectation check** — using the bands from `benchmark-expectations.json` (Phase 2a source 1):
- **If the family is STALE (Phase 2a staleness gate):** emit `RERUN-NEEDED` and STOP — do not file a regression. The stored observation predates too many analyzer/prompt-touching commits to be a valid comparison.
- verdict direction inverted vs. `expectedVerdictLabels`
- `truthPercentage` outside the `truthPercentageBand` by more than `noiseTolerancePct`
- `confidence` outside the `confidenceBand` by more than `noiseTolerancePct`
- `boundaryCount` below `minBoundaryCount` (skip if `minBoundaryCount: null`)
- If `qualityStatus` is `IMPROVED-NOT-CLOSED` or `INFERENTIAL`, note the known open issue before flagging — do not file a regression for a known-open pattern
- If `expectedVerdictLabels: null`, emit `RERUN-NEEDED` rather than a regression finding

**3b. Input integrity** — compare `inputValue` against the Captain-defined list in `AGENTS.md §Captain-Defined Analysis Inputs`. Paraphrase, translation, normalization, or truncation is a finding.

**3c. Evidence health**:
- `probativeValue` distribution: high/medium/low mix — flag if `low` dominates (>60%)
- `sourceType` mix: `peer_reviewed_study` / `news_primary` / `opinion` ratio appropriate for the claim domain
- `claimDirection` distribution: supporting/contradicting/neutral balance vs. `evidenceBalance.isSkewed`
- Evidence language vs. `languageIntent`: foreign-jurisdiction evidence on a jurisdiction-specific claim is a known contamination pattern; cross-reference `benchmark-expectations.json §knownOpenIssues` before filing as new

**3d. Boundary clustering sanity**:
- Boundaries correspond to meaningfully different claim assessments, or are they duplicates / near-duplicates / evidence-starved?
- Compare `boundaryCount` against `minBoundaryCount` and against the narrative in `benchmark-expectations.json §qualityStatusNote`

**3e. Verdict reasoning trace** — read each `claimVerdicts[*].verdictReason`. Flag:
- reasons that cite evidence not present in the boundary's evidence set
- reasons that contradict the final `verdictLabel`
- reasons that treat opinion/disputed evidence as if `contestationWeights` aggregation applied — check `aggregation-stage.ts` if needed (structural read, no edits)

**3f. Warning severity (AGENTS.md §Report Quality & Event Communication)**:
- `warning`+ for an event that fully recovered via fallback → flag as over-escalation
- `info`/`silent` for a degrading signal that would change confidence tier → flag as under-escalation
- unregistered warning types (not in `warning-display.ts`) → schema-drift finding

**3g. Cross-report patterns** — if 2+ reports share a finding, tag it `SYSTEMIC`; otherwise `REPORT-SPECIFIC`. Systemic findings take priority in the fix list.

**3h. Systemic health & concurrency-induced failure (mandatory — always run):**

Before filing any finding against a prompt or stage, rule out infrastructure causes:

- Concurrency-induced collapse: if 2+ reports in scope satisfy all of: meta.evidenceBalance.total equals 0, meta.llmCalls under 20, and submission times within 5 seconds of each other, file as INFRASTRUCTURE-CONCURRENCY, not as a regression. Fix mechanism: workflow-gate (serialize submissions) or ucm-config (reduce FH_RUNNER_MAX_CONCURRENCY).
- LLM-timeout pressure: if any scoped report has isDegenerate, run a ripgrep against apps/web/debug-analyzer.log for Fix3 errors, LLM timeouts, TPM fallbacks, and 429 responses. Over 50 matches on the execution date means weight findings toward infrastructure. Over 200 per day is a Phase 6 meta-recommendation on its own. If the log file is missing or rotated, record LLM-timeout rate: unknown in Phase 7a and proceed without this signal (do not block other 3h checks).
- Model fallback cascade: if meta.runtimeRoleModels has fallbackUsed true for verdict or reconciler, note it in the report block. The verdict came from the fallback model, not the configured one, so the quality baseline shifts.
- Prompt rollout drift: query apps/web/config.db for the active claimboundary prompt hash and activated_utc. If the active hash does not match any in-scope meta.promptContentHash and the activated_utc predates HEAD's prompt commits, flag PROMPT-ROLLOUT-DRIFT. Fix mechanism is prompt-rollout (reseed), never a prompt edit.

**3i. Historical regression analysis (conditional — run when 3a filed a regression finding against a family whose `qualityStatus` is `SOLVED`, `SOLVED-MAIN-BLOCKER`, `SOLVED-VISIBLE-CONTAMINATION`, `PARSE-FAILURE-FIXED`, or `CONFIRMED-ON-CURRENT-HEAD`. Skip for families whose status indicates they are not yet proven at HEAD — there is nothing to regress from.):**

Goal: find whether a prior run of the same input scored better, identify the commit(s) that could explain the drop, and assess whether rollback is a viable fix class.

All rollback proposals inherit non-negotiable constraints 1–9. A rollback to wording that violates rule 1 (e.g., reintroduces benchmark-specific vocabulary) is REJECTED regardless of quality delta — forward-fix is required instead.

**3i.1. Find prior runs of the same input.** Exact match on `InputValue` (case-sensitive, full string):
```bash
sqlite3 apps/api/factharbor.db \
  "SELECT JobId, CreatedUtc, VerdictLabel, TruthPercentage, Confidence, ExecutedWebGitCommitHash, PromptContentHash
   FROM Jobs
   WHERE InputValue = ? AND Status = 'SUCCEEDED'
   ORDER BY CreatedUtc DESC LIMIT 20;"
```
Also scan `test-output/` for result JSONs whose top-level `inputValue` matches exactly; read matched files for their `meta`.

**3i.2. Rank prior runs (deterministic rubric — structural, no LLM).** For each prior job compute:
```
bench-score =
  +2 if verdictLabel in expectedVerdictLabels
  +1 if truthPercentage within truthPercentageBand (±noiseTolerancePct)
  +1 if confidence within confidenceBand (±noiseTolerancePct)
  +1 if boundaryCount >= minBoundaryCount
  +1 if evidenceBalance.total > 0
  +1 if not isDegenerate
```
Use bands from `benchmark-expectations.json` for the matching family. `lastGoodJob` = highest-scoring prior run. If no prior run beats the current `TARGET-REPORT`, emit `NO-PRIOR-BETTER` and exit 3i for this input — there is no historical regression to analyze.

**3i.3. Identify the change window.** `lastGoodCommit` = `lastGoodJob.executedWebGitCommitHash` stripped of any `+dirty` suffix. Enumerate commits that touched analysis-relevant paths:
```bash
git log --oneline <lastGoodCommit>..HEAD -- apps/web/prompts/ apps/web/src/lib/analyzer/ apps/web/configs/
```
Filter out doc-only and test-only commits. Record `REGRESSION-WINDOW` (list of candidate commits).

**3i.4. Prompt-blob diff (only if prompt files are in the window AND both hashes are recoverable).** Retrieve both blobs from `config.db`:
```bash
sqlite3 apps/web/config.db "SELECT content FROM config_blobs WHERE content_hash='<lastGoodJob.PromptContentHash>'"
sqlite3 apps/web/config.db "SELECT content FROM config_blobs WHERE content_hash IN (SELECT active_hash FROM config_active WHERE config_type='prompt' AND profile_key='claimboundary')"
```
Diff by rendered section. Focus on sections named in 3a/3e findings. If `lastGoodJob.PromptContentHash` is null or the blob is not in the DB, fall back to `git show <lastGoodCommit>:apps/web/prompts/claimboundary.prompt.md` as an approximation (note `COMMIT-APPROXIMATE` in the finding).

**3i.5. Bisection guidance (no auto-bisection).** If `REGRESSION-WINDOW` has >3 commits, recommend `/validate <family-slug>` at the midpoint in Phase 7f. Never auto-run bisection — the $1–5 cost per real-LLM run requires Captain authorization.

**3i.6. Rollback feasibility classification.** For each implicated commit, assess:
- Does the change touch sections used by OTHER families in `benchmark-expectations.json §families`? (structural check — grep the implicated section for entity-neutral patterns that other families would match)
- Is the commit single-concern (one diff hunk) or bundled (multiple hunks)?
- Does the wording delta, reverted, pass rule 1 (Generic by Design)?

Classify each candidate rollback-target as one of:
- `SAFE-FULL-ROLLBACK` — single-concern commit, touches only the regression family's codepath, reverting passes rule 1
- `PARTIAL-ROLLBACK` — revert a specific section only; cite the exact section; other sections of the commit stay
- `MODIFICATION` — the direction of the change was correct but the specific wording broke something; propose a targeted re-edit that keeps the intent and passes rules 1 + 7
- `NOT-ROLLBACKABLE` — entangled with other families or with structural code; forward-fix required via generic prompt clarifier or UCM

Record:
```
REGRESSION-FINDINGS[
  finding-id, inputHash (first-16 chars of sha256(inputValue)),
  currentJob, lastGoodJob, benchScoreDelta,
  regressionWindow (commits),
  promptDiffSummary (sections differing, or NO-PROMPT-DIFF, or COMMIT-APPROXIMATE),
  rollbackClass (SAFE-FULL-ROLLBACK | PARTIAL-ROLLBACK | MODIFICATION | NOT-ROLLBACKABLE),
  rollbackTarget (commit:file:section or "none — forward-fix required")
]
```

Record:
```
FINDINGS[id, type=REPORT-SPECIFIC|SYSTEMIC|INFRASTRUCTURE|REGRESSION, dimension=3a–3i, severity,
         confidence=CONFIRMED|INFERRED|SPECULATIVE,
         evidence (exact field values + command output for 3h and 3i),
         cross-ref (KNOWN-ISSUES id or NEW),
         regressionLink (id of REGRESSION-FINDINGS entry, if 3i fired)]
```

Also record which dimension letters (3a–3i) have findings — the **active dimension set** fed to Phase 4. Dimension 3h `INFRASTRUCTURE` findings SKIP Phase 4 and go straight to Phase 5 as `workflow-gate` or `ucm-config` fixes. Dimension 3i `REGRESSION` findings are passed to the Regression-Rollback Reviewer in Phase 4.

---

## Phase 4 — Adaptive multi-agent debate

Spawn only the sub-agents whose dimension has findings. Do not spawn a panel for a dimension with no Phase 3 findings.

**Anti self-eval bias (mandatory):** per LLM Expert Role_Learnings ("LLM self-eval bias"), LLMs rate same-family output higher on correlated dimensions. Every panel below MUST lead with structural checks (count-based, schema-based, cross-reference checks) before any subjective evaluation. Panels cite observed values, not impressions.

**Panel map — spawn only active panels, in a single parallel message:**

| Panel | Active when | Structural checks (cite values) | Subjective lens (only after structural) | Subagent type |
|---|---|---|---|---|
| Prompt Genericity Reviewer | 3a, 3c, or 3e has findings AND at least one candidate fix would touch `apps/web/prompts/*` | (a) Does proposed wording contain any token from AGENTS.md Captain-Defined Analysis Inputs? (b) Does it cite a named entity, region, or date-period? (c) Does it rely on English-only idioms or word-order? | Is the wording clearer or stabler than current text without adding specificity? | `Explore` |
| Evidence & Boundary Reviewer | 3c or 3d has findings AND 3h did NOT file INFRASTRUCTURE-CONCURRENCY | (a) evidenceItems.length vs sources.length ratio; (b) claimDirection balance; (c) applicability distribution; (d) boundaryCount vs minBoundaryCount; (e) per boundary: evidenceScopeIds.length greater than 0? | Do boundary labels reflect analytically distinct frames, or near-duplicates? | `general-purpose` |
| Verdict Reasoning Reviewer | 3e has findings | Per claimVerdicts[i]: (a) does verdictReason reference any evidence ID NOT in supportingEvidenceIds union contradictingEvidenceIds? (b) does truthPercentage direction match the verdict label (FALSE should be under 50)? (c) is isContested=true present but reasoning does not address counter-evidence? | Does the reasoning engage the strongest counter-evidence, or dismiss it? | `general-purpose` |
| Warning Severity Reviewer | 3f has findings | (a) Is each warning type registered in warning-display.ts? (b) Any severity at warning or above for a fully-recovered fallback event (AGENTS.md severity table)? (c) Any info/silent for a confidence-tier-changing degrader? | Would a non-technical reader correctly prioritize these warnings? | `general-purpose` |
| Regression-Rollback Reviewer | 3i has findings (REGRESSION-FINDINGS is non-empty) | (a) Does `lastGoodJob` actually score higher on the bench rubric (recompute and cite)? (b) Does `regressionWindow` contain a commit that touched the implicated prompt section or stage file? (c) For each proposed `rollbackTarget`: would reverting it affect any OTHER family's qualityStatus? (grep the reverted section for neutral patterns that match other families' inputs) (d) Does the reverted wording pass rule 1 (no benchmark-specific vocabulary) and rule 7 (multilingual)? | Among candidate rollback targets, which one is most surgical — minimum diff, maximum regression-fix coverage? Or does the analysis point to MODIFICATION rather than revert? | `general-purpose` |
| Devil's Advocate | always (when Phase 4 spawns at all) | (a) Each fix passes the Generic Test (helps inputs unlike the failing one)? (b) Any family in benchmark-expectations.json close enough to the fix's target behavior that it could regress? (c) Cheaper mechanism (UCM tunable, workflow gate) for the same outcome? (d) If 3i proposed a rollback, is there a forward-fix that gets the same effect without reverting? | Is the panel's "finding" actually correct behavior Captain would want preserved? | `general-purpose` |

**Sub-agent brief template — use verbatim for each spawned panel. Fill only the `<<...>>` placeholders.**

```
You are <<PANEL NAME>> for /report-review on FactHarbor. You have no memory of prior runs.

NON-NEGOTIABLE CONSTRAINTS — cite rule number if rejecting anything:
- Rule 1 (Generic by Design) VERBATIM: <<paste constraint 1>>
- Rule 2 (No new deterministic text analysis) VERBATIM: <<paste constraint 2>>
- Rule 7 (Multilingual robustness) VERBATIM: <<paste constraint 7>>
- Rules 3, 4, 5, 6, 8, 9 — SUMMARY (cite rule number when rejecting):
  3 = no string-match tests as mitigations
  4 = no deterministic verdict manipulation in source code
  5 = analysis-affecting strings live only in prompts or web-search queries
  6 = UCM is the home of tunables (not hardcoded)
  8 = warning severity reflects verdict impact, not internal noise
  9 = index-first for handoff scans, not directory grep

CONTEXT BUNDLE (authoritative; do not re-read files this summarizes):
- HEAD: <<sha>> | DIRTY: <<bool>>
- TARGET-REPORTS (compact table):
  jobId8 | slug | verdict | truth | conf | isDegenerate | llmCalls | evidenceTotal
  <<rows>>
- KNOWN-ISSUES anchor (Phase 2c):
  <<table>>
- Findings assigned to you:
  <<for single-dimension panels: subset of FINDINGS matching this panel's "Active when">>
  <<for Devil's Advocate: the full set of surviving findings from all other active panels plus each panel's [FIX <1..3>] headlines — no dimension filter>>
- Files you may open (bounded; do not wander):
  <<panel allowlist from Panel Allowlists table below — do not read anything else>>

YOUR TASK — structural checks FIRST (anti self-eval bias):
1. Run the structural checks from your panel row verbatim. Cite values, not impressions.
2. Confirm or reject each assigned finding. One of: CONFIRM, REJECT(rule#), REFRAME(proposed wording).
3. Propose up to 3 safe fix directions (headlines, not full specs). Mark each with its mechanism.
4. Total output at most 300 words. No hedging. No defense against Devil's Advocate.

RETURN FORMAT (strict — main thread parses by line prefix):
[STRUCTURAL] <one line per check with value or PASS>
[FINDING <id>] CONFIRM | REJECT <rule#> | REFRAME — <one-sentence reason>
[FIX <1..3>] <mechanism> — <one-sentence direction>
[NEW] (optional) id=<id> Pcode=<P1-P12> severity=<...> confidence=<...> observation=<...> root-cause=<...> cross-ref=<...>
```

**Panel Allowlists (canonical — the main thread fills `<<panel allowlist>>` from this table):**

| Panel | May open |
|---|---|
| Prompt Genericity Reviewer | `apps/web/prompts/*.prompt.md`, `AGENTS.md §Captain-Defined Analysis Inputs` |
| Evidence & Boundary Reviewer | in-scope `ResultJson` slices already in the context bundle; `apps/web/src/lib/analyzer/evidence-filter.ts` (read-only) |
| Verdict Reasoning Reviewer | in-scope `ResultJson.claimVerdicts` slices from the context bundle; `apps/web/src/lib/analyzer/aggregation-stage.ts` (read-only) |
| Warning Severity Reviewer | `apps/web/src/components/warning-display.ts` (or equivalent path); `AGENTS.md §Report Quality & Event Communication` |
| Regression-Rollback Reviewer | `apps/web/prompts/claimboundary.prompt.md` at HEAD and at `<lastGoodCommit>`; `git log`/`git show` output from Phase 3i.3-3i.4 already in the context bundle; `Docs/AGENTS/benchmark-expectations.json` families array |
| Devil's Advocate | context bundle only (no file reads — argues from panel outputs) |

**Exit clause — empty panel set:** if Phase 3 produced findings but no dimension maps to a panel (e.g., only 3b input-integrity or 3g cross-report-tagging findings), Phase 4 is SKIPPED entirely. All Phase 3 findings carry forward to Phase 5 with `confidence` downgraded one tier (CONFIRMED→INFERRED, INFERRED→SPECULATIVE) to reflect the absence of cross-panel confirmation. Record the skip in Phase 7a as `Phase 4: skipped — no panel-mapped findings`.

**Debate reconciliation (main thread):**
```
Finding | Panel-A | Panel-B | ... | Devil's Advocate | Verdict
```
A finding survives only if **≥2 active specialist panels confirm** AND Devil's Advocate cannot rebut with a concrete regression risk. Rebutted findings are downgraded to `SPECULATIVE` or dropped. Do not defend against the Devil's Advocate in the user-facing report — reframe or drop.

---

## Phase 5 — Proposed fixes (constrained to allowed mechanisms)

Every fix proposal MUST declare its mechanism and pass the constraint gate.

**Allowed mechanisms:**

| Mechanism | When | Constraint reminder |
|---|---|---|
| Prompt edit (generic wording) | Instruction ambiguity, missing constraint, insufficient scaffold | Rule 1: no benchmark terms, entities, regions, dates. Rule 7: works in every language the pipeline supports. |
| UCM config change | Threshold, weight, model-route, limit tuning | Update `apps/web/configs/*.default.json` AND `config-schemas.ts` in sync; drift verified by `config-drift.test.ts` |
| Stage code — structural only | Schema mismatch, retry/timeout, null-guard, warning registration | Rule 2: no analytical decision logic. LLM call stays as the decision point. |
| Workflow gate | Human-in-loop quality check, pre-merge benchmark rerun, rollout verification, serialize concurrent submissions | Documented procedure; no code change |
| Prompt rollout action | Active blob differs from current file (see 3h prompt rollout drift) | `npm -w apps/web run reseed:prompts` or full build |
| Data update (expectations file) | A rerun verified (or refuted) a family's quality at HEAD; new observation replaces or augments `latestVerifiedJobId`/`latestObserved`; bands widen to include the new point only when inside `noiseTolerancePct` | Update `Docs/AGENTS/benchmark-expectations.json` only. Do NOT change `qualityStatus` from the same-run data that triggered the update; qualityStatus changes require either a direct rerun confirmation or Captain approval. Rule 2 not violated — data file, no analytical logic. |

**Rejected mechanisms (never propose):**
- Hardcoded keyword list in code — rules 1+2
- Regex guard on LLM output interpreting meaning — rule 2
- Post-hoc truthPercentage adjustment based on input content — rule 4
- Unit test asserting specific words in prompt or verdict — rule 3
- Forbidden-term list or banned-phrase filter — rules 1–3

**For each surviving finding:**
```
[F##] <severity> | <SYSTEMIC|REPORT-SPECIFIC|INFRASTRUCTURE|REGRESSION> | dim <3x>
Mechanism:          <prompt-edit | ucm-config | stage-code-structural | workflow-gate | prompt-rollout | data-update | partial-rollback | full-rollback | modification>
Target file/path:   <specific path or commit:file:section for rollback mechanisms>
Change (specific):  <exact generic wording, config delta, structural edit, or revert-section spec>
Constraint gate:    PASS — <which rules apply and why this passes them>
Generic test:       <yes/no + reasoning — does this help inputs unlike the failing one?>
Regression risk:    <families from benchmark-expectations.json that could shift, or "none expected">
Expected outcome:   <behavioral change in concrete terms>
Cross-ref:          <KNOWN-ISSUES id or NEW>
Rollback-from:      <commit sha + section/subset, or "n/a — forward-fix">    # populated iff mechanism is *rollback or modification
Rollback-class:     <SAFE-FULL-ROLLBACK | PARTIAL-ROLLBACK | MODIFICATION | NOT-ROLLBACKABLE | n/a>
LastGood-job:       <jobId of prior better run, or n/a>                        # so Captain can inspect the before/after
```

**Rollback mechanism guidance:**
- `partial-rollback` is the preferred form when Phase 3i classified the target as `PARTIAL-ROLLBACK`. Specify the exact section, not the whole commit.
- `full-rollback` is only used for `SAFE-FULL-ROLLBACK` targets — single-concern commit, no cross-family impact.
- `modification` is for `MODIFICATION` targets — the direction of the change was correct; propose revised generic wording that preserves the commit's intent and fixes the regression. Must pass rule 1 + rule 7.
- `NOT-ROLLBACKABLE` targets do NOT emit a rollback fix. Instead, propose a forward-fix under `prompt-edit` or `ucm-config` mechanisms with `Rollback-from: n/a`.

Order: PHASE-BLOCKER → HIGH → MEDIUM → LOW, then CONFIRMED before INFERRED, then SYSTEMIC before REPORT-SPECIFIC.

---

## Phase 6 — Meta-recommendations

Based on recurring patterns across `TARGET-REPORTS` AND handoffs already read in Phase 2a, propose infrastructure or workflow improvements. Each entry must state: *problem observed → proposed change → why it is structural, not analytical → rough cost/benefit*.

Examples of what belongs here (pick only those that actually apply — no speculative list):
- Prompt activation verification (active blob vs. file drift has recurred multiple times — see `feedback_deploy_config_state.md`)
- `analysisIssueCode` taxonomy gaps if Phase 3 flagged uncoded failure modes
- `benchmark-expectations.json` update procedures — when to update after a rerun wave, who is responsible
- Cross-run quality trend aggregator (read-only structural tool — no analysis logic, rule 2 not violated)
- Handoff indexing if the RAG scan in Phase 2a started missing relevant entries
- Promotion of `/report-review` into pre-release or nightly workflow once it has proven value

---

## Phase 7 — Output format

**Output mode** (determined from `$ARGUMENTS` and scope size):
- Default: **concise** — emit 7a, 7c top-10 findings, 7d top-5 fixes, 7f escalation hints only.
- `$ARGUMENTS` contains `--full` OR scope has more than 5 reports → **full** — emit every subsection.
- `$ARGUMENTS` contains `--dry-run` → emit 7a (scope summary) plus a "would analyze" list describing which dimensions and panels would activate, then STOP. No Phase 4 spawn, no fix proposals, no Phase 8 writes.

Emit in this order, terse:

### 7a. Scope summary
```
HEAD:              <sha> <short>
DIRTY:             <yes/no>  (analyzer/prompt changes only; docs-only dirt noted separately)
Scope:             <how scope was chosen + output mode>
Reports:           <count> (SUCCEEDED / failed / degraded)
Degenerate count:  <count where isDegenerate=true>
Families in scope: <list of slugs from benchmark-expectations.json>
LLM-timeout rate:  <match count from 3h grep, or n/a>
Active prompt:     <active_hash[:16] — activated_utc>  (for claimboundary profile)
```

### 7b. Per-report snapshot
One block per target report. Structure mirrors `/prompt-diagnosis §5a`, with these additional lines:
```
EXPECTATION-DELTA: verdictLabel <observed vs expected>, truthPct <observed vs band>, confidence <observed vs band>, boundaries <observed vs minBoundaryCount>
KNOWN-OPEN:        <knownOpenIssues from expectations file if any>
REGRESSION:        <if 3i fired>
  last-good:       <jobId> at commit <sha[:8]> — verdict <label>/<truth>/<conf>, bench-score <n>
  current:         bench-score <n>  (delta: <-n>)
  window:          <N commits between last-good and HEAD touching analysis paths>
  prompt-diff:     <rendered section names that differ, or NO-PROMPT-DIFF, or COMMIT-APPROXIMATE>
  rollback-class:  <SAFE-FULL-ROLLBACK | PARTIAL-ROLLBACK | MODIFICATION | NOT-ROLLBACKABLE>
  rollback-target: <commit:file:section, or "none — forward-fix required">
```
If 3i emitted `NO-PRIOR-BETTER`, add a one-line note: `REGRESSION: no prior run scored higher — not a historical regression.`

### 7c. Debated findings table
```
F## | Type | Dim | Severity | Confidence | Survived debate? | Cross-ref
```

Include a `Rejected findings` row for any finding that was dropped during debate — label it with the reason. This is telemetry, not apology.

### 7d. Proposed fixes
Phase 5 blocks in order.

```
Rejected fixes (policy violations):
  <any fix that was dropped + rule number violated>
```

### 7e. Meta-recommendations
Phase 6 list.

### 7f. Escalation hints
- PHASE-BLOCKER SYSTEMIC surviving → `/audit`
- Finding implicates prompt runtime provenance specifically → `/prompt-diagnosis` (narrower follow-up)
- Finding requires real-LLM validation → `/validate <slug>` (note $1–5 cost)
- `DIRTY=yes` AND finding cites executed code → root-cause attribution is approximate; blob via `promptContentHash` may still be exact
- All reports predate HEAD → recommend targeted rerun before acting
- Any family with `qualityStatus: UNVERIFIED-ON-CURRENT-STACK` in scope → recommend rerun per `highPriorityReruns` order in `benchmark-expectations.json`
- 3i `REGRESSION-WINDOW` has more than 3 commits → recommend `/validate <family-slug>` at the midpoint commit to narrow the regression (real-LLM, $1–5 cost — needs Captain authorization)
- 3i proposed `SAFE-FULL-ROLLBACK` or `PARTIAL-ROLLBACK` → Captain should review the specific section diff before applying; `git show <commit>:<file>` for verification
- 3i classified every candidate target as `NOT-ROLLBACKABLE` → the regression is entangled with other work; `/audit` the whole prompt surface before forward-fixing

---

## Phase 8 — Prompt Issue Register auto-update

For each surviving finding that is **CONFIRMED** and **prompt-related**:

1. Spawn a single `general-purpose` sub-agent with this brief (verbatim; fill `<<...>>`):

```
You are a Prompt Issue Register reviewer for /report-review. You have no memory of prior runs.

GIVEN FINDING:
<<paste the finding block>>

EXISTING REGISTER (for near-duplicate detection):
<<paste Docs/AGENTS/Prompt_Issue_Register.md if it exists; otherwise "register does not yet exist">>

STRUCTURAL CHECKS — do these first (all are enumerable; no judgment calls):
1. Is the prompt file OR profile explicitly named in the finding text (exact string match on `apps/web/prompts/*.prompt.md` or profile keys like `claimboundary`, `text-analysis-verdict`)?  (yes/no)
2. Is a rendered section, line range, or prompt section heading cited?  (yes/no)
3. Specificity check — count in the finding: (a) number of distinct jobIds cited, (b) number of distinct concrete field values cited (e.g., `truthPercentage=50`, `boundaryCount=0`), (c) presence of exact quoted wording of at least 8 characters. Eligible iff: (a) ≥ 1 AND ((b) ≥ 1 OR (c) is true).  (yes/no — output the three counts)
4. Does the finding's `root-cause` field contain either "prompt" or "prompt rollout" but NOT "infrastructure" / "3h" / "timeout" / "concurrent" / "stage code bug"?  (yes/no)
5. Scan existing register for near-duplicates: is there an entry with the same Pcode AND same prompt-file AND whose `description` field shares at least 8 consecutive-word overlap with this finding's root-cause?  (yes/no — if yes, list the existing entry ID)

DECISIONS:
- REGISTER-ELIGIBLE = yes iff checks 1–4 all pass.
- LOW-RISK = yes iff REGISTER-ELIGIBLE=yes AND check 5 is no (no near-duplicate).
- If check 5 is yes (near-duplicate), return LOW-RISK=no AND propose UPDATE-EXISTING=<existing entry ID> with specific fields to update (last-confirmed, prompt-hash, commit).

RETURN FORMAT (strict):
[CHECK 1] yes|no — <one-sentence>
[CHECK 2] yes|no — <one-sentence>
[CHECK 3] yes|no — <one-sentence>
[CHECK 4] yes|no — <one-sentence>
[CHECK 5] yes|no [dup-of=<id or none>] — <one-sentence>
[REGISTER-ELIGIBLE] yes|no
[LOW-RISK] yes|no
[UPDATE-EXISTING] <id or none>
[FORMATTED BLOCK]
<<formatted per /prompt-diagnosis §6b, only if REGISTER-ELIGIBLE=yes>>
```

2. Auto-write the entry to `Docs/AGENTS/Prompt_Issue_Register.md` **only if** all of:
   - `REGISTER-ELIGIBLE=yes AND LOW-RISK=yes`
   - `$ARGUMENTS` does not contain `--dry-run` (the Phase 7 dry-run gate forbids Phase 8 side effects)
   - `/prompt-diagnosis` was NOT already invoked for this `HEAD-SHA` (check register: if any entry's `last-confirmed` line cites `HEAD-SHA` within the last 24h, skip the write and record `PROMPT-DIAGNOSIS-OVERLAP` in 7d under `Phase 8 log` — /prompt-diagnosis §6 owns the write for that finding)
   - The register file is writable (no `EACCES`, no Windows file-lock failure from an open editor)

   **Write procedure (Windows-safe, atomic):** write the candidate block to `Docs/AGENTS/Prompt_Issue_Register.md.tmp` first, then rename over the original (`os.rename` is atomic on the same filesystem on Windows when the destination is not open). If the rename fails (destination locked, typically because Captain has the file open in an editor), leave `.tmp` in place, record `REGISTER-LOCKED` in 7d, and do not retry — the next `/report-review` run will append on top of a resolved lock.

   Create the register with the header from `/prompt-diagnosis §6a` if it does not exist (write directly to the real file since nothing is there yet to lock).

3. If `REGISTER-ELIGIBLE=yes AND LOW-RISK=no AND UPDATE-EXISTING=<id>`: append an update-confirmation to the existing entry (`last-confirmed: <this-run>`, bump `prompt-hash`, etc.) instead of creating a new one. Do not ask Captain.

4. If `REGISTER-ELIGIBLE=no`: list the finding in 7d under `Register-skipped entries` with the failed check number and reason.

5. Update KNOWN-RECURRING entries (`already-fixed: yes` → `status: resolved`, etc.) following `/prompt-diagnosis §6c–6d`.

6. **Audit log:** for every Phase 8 decision (write, update, skip), emit one line in 7d under `Phase 8 log`: `<finding-id> → <action> — <reviewer's one-sentence reason>`. This is telemetry, not apology.

---

## Self-check before reporting

Before emitting output, re-read the non-negotiable constraints and scan all proposed fixes:
- Does any fix name a benchmark input, entity, region, or date? → revise or drop
- Does any fix add a unit test asserting prompt/verdict word content? → drop
- Does any fix put a threshold in code instead of UCM? → move to UCM
- Does any fix bypass an LLM call with a rule? → drop
- Does any fix silence a degrading signal? → drop

Dropped fixes must appear in 7d under `Rejected fixes` with the rule number violated.
